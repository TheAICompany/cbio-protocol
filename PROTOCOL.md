# Claw-biometric Protocol

Normative specification for Claw-biometric (c-bio).

If any document in this repository conflicts with this file on protocol shape or
verification semantics, this file is the source of truth.

This specification defines cryptographic primitives, `agent_id` derivation,
schemas for signed objects, canonical serialization, and verification steps. It
does not define runtime storage, CLI flows, secret-name prefixes, SDK
ergonomics, or application policy.

## Non-goals (normative boundary)

This specification does not define:

- relying-party account registration or authorization logic
- site sessions or token issuance
- billing, abuse prevention, or product policy systems
- replacement of OAuth, OIDC, JWT, API keys, or hosted authentication products

Implementations produce verifiable bindings between keys, identifiers, and
signed objects. Relying parties decide how to use verification outcomes.

How verification outcomes are composed with OAuth, OIDC, site sessions, or
hosted identity products is an integration concern **outside** this specification.

## Canonical Entry Point

```ts
import {
  deriveRootAgentId,
  createIdentity,
  generateNonce,
  signPayload,
  verifySignature,
  generateIdentityKeys,
  derivePublicKey,
} from '@the-ai-company/agent-identity-sdk/protocol';

```

Sealed blob helpers for vault portability live in
`@the-ai-company/agent-identity-sdk/migration`, not in the protocol module.

## Authority tree (data model)

Signed chain objects in this specification assume a directed tree:

- Exactly one root per chain: an authority with no issuer parent in that chain.
- Child agents are bound to a parent authority via signed objects defined below.

Unless extended by a future version, implementations MUST treat the model as a
tree, not an arbitrary graph.

## Base Primitives

The following are normative:

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(publicKey)`

They are necessary but not sufficient for full chain verification.

### Agent identifier (`agent_id`)

`deriveRootAgentId(publicKey)` yields `agent_id`, the canonical string identifier
for a root agent (conventionally prefixed `agt_`). It is derived deterministically
from the root public key. Distinct accepted public keys MUST map to distinct
`agent_id` values under this derivation. Implementations MUST NOT substitute
local storage paths or ad hoc string prefixes for `agent_id`.

## Canonical Objects

### AuthorityIdentity

```ts
interface AuthorityIdentity {
  cbio_protocol: 'v1.0';
  kind: 'authority_identity';
  authority: {
    agent_id: string;
    public_key: string;
    key_version: number;
  };
}
```

`AuthorityIdentity` identifies an origin authority.

It is not an issuance result. It has no parent object and no parent signature.
Its role in the protocol is to identify the root from which an authority tree
begins.

### IssuedAgentIdentity

```ts
interface IssuedAgentIdentity {
  cbio_protocol: 'v1.0';
  kind: 'issued_agent_identity';
  agent: {
    agent_id: string;
    public_key: string;
    key_version: number;
  };
  authority: {
    agent_id: string;
    public_key: string;
    key_version: number;
  };
  issuance: {
    issued_at: string;
    expires_at?: string;
    sequence: number;
  };
  capabilities?: string[];
  metadata?: Record<string, string>;
  authority_signature: string;
}
```

### DelegationCertificate

```ts
interface DelegationCertificate {
  cbio_protocol: 'v1.0';
  kind: 'delegation_certificate';
  issuer: {
    agent_id: string;
    public_key: string;
    key_version: number;
  };
  delegate: {
    agent_id: string;
    public_key: string;
    key_version: number;
  };
  delegation: {
    issued_at: string;
    expires_at?: string;
    capabilities: string[];
    constraints?: Record<string, string>;
    sequence: number;
  };
  issuer_signature: string;
}
```

### RevocationRecord

```ts
interface RevocationRecord {
  cbio_protocol: 'v1.0';
  kind: 'revocation_record';
  issuer: {
    agent_id: string;
    public_key: string;
    key_version: number;
  };
  target: {
    kind: 'issued_agent_identity' | 'delegation_certificate';
    subject_agent_id: string;
    sequence: number;
  };
  revocation: {
    revoked_at: string;
    reason?: string;
  };
  issuer_signature: string;
}
```

### AuthorityChain

```ts
interface AuthorityChain {
  cbio_protocol: 'v1.0';
  kind: 'authority_chain';
  authority_root: AuthorityIdentity;
  issued_agent: IssuedAgentIdentity;
  delegations?: DelegationCertificate[];
  revocations?: RevocationRecord[];
}
```

## Canonical Serialization

Signed objects defined in this specification use deterministic unsigned payload
serialization.

Rules:

1. Remove the signature field before serialization.
2. Serialize fields in canonical schema order.
3. Omit fields that are `undefined`.
4. Preserve array order exactly.
5. Sort keys lexicographically for `metadata` and `constraints`.
6. Encode as UTF-8 JSON with no insignificant whitespace.

Use `canonicalizeGovernanceObjectForSigning(...)` to produce the payload.

## Verification Model

Verifiers validate key-to-identifier binding and, when present, signed chain
objects. A verifier does not assign root status by policy; it checks that the
declared root object matches the schema and has no issuer parent in the chain.

For each identity reference:

1. derive agent id from public key
2. compare to declared agent id
3. reject on mismatch

For issued identities, delegations, and revocations:

1. validate embedded identity references
2. canonicalize the unsigned payload
3. verify the signature
4. enforce time validity where applicable

For authority chains:

1. validate root authority
2. validate issued agent
3. validate delegations
4. validate revocations
5. reject chains invalidated by revocation

## Relying-party integration (patterns)

The following are descriptive names for common deployments. They do not add
requirements beyond the verification rules above.

### Profile 1: Artifact verification

The relying party validates proof material locally, then uses the result in its
own account or policy store.

### Profile 2: Online verification

The relying party obtains a verification result from a service, then continues
its own authentication flow.

### Profile 3: Signed request with identity context

The relying party validates chain objects separately from request signing.

## Artifact and lifecycle expectations

Transport envelopes SHOULD expose: protocol version; asserted identities or
chain; issuance time; optional expiry; whether online revalidation is expected;
effect of revocation.

## Stability and conformance

Independent implementations MUST be able to reach the same verification result
for the same inputs. Therefore:

- canonical object shapes and signature inputs remain explicit and versioned
- conformance tests and test vectors are part of the protocol surface

If a behavior is not specified precisely enough to reproduce across
implementations, it is not yet a stable protocol fact.

## References

- `src/identity.ts`
- `src/crypto.ts`
