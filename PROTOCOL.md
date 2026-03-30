# Claw-biometric Protocol

This document is the canonical Claw-biometric protocol specification.

If any other document in this repository differs from this file on protocol
shape or verification semantics, this file is the source of truth.

Claw-biometric (c-bio) is a governed agent identity protocol.

The protocol is identity-first:

- every agent is a first-class identity
- a root authority is itself an agent identity
- non-root agents exist because an authority issued or delegated them
- governance relationships between identities are protocol-visible
- runtime vaults are consequences of identity ownership, not the center of the
  protocol

The protocol does not define runtime storage, CLI flows, secret-name prefixes,
or SDK-specific ergonomics.

## Non-Goals And Boundaries

CBIO is an agent identity and governance protocol.

Its job is to help a relying party answer:

- which agent is acting
- whether that agent controls the claimed key material
- whether that agent sits under an authority relationship the relying party
  cares about

CBIO does not attempt to replace:

- relying-party registration systems
- relying-party authorization logic
- site sessions or token issuance
- billing, abuse prevention, or product policy systems
- prevailing auth standards such as OAuth, OIDC, JWT, API keys, or service auth

Canonical boundary:

CBIO proves who the acting agent is.
The relying party decides what to do with that fact.

## Compatibility Profile

CBIO is designed to compose with existing auth and trust infrastructure rather
than compete with it head-on.

This means:

- a site may continue to use Auth0, internal auth systems, or API gateway
  enforcement after CBIO identity verification
- CBIO proof may be mapped into local accounts, trust tiers, or policy checks
- adopting CBIO should not require a relying party to replace its current auth
  stack

CBIO should be treated as an agent identity layer and verification substrate.
It is not a universal replacement for mainstream application auth systems.

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

## Model

The near-term model is an authority tree:

- one root authority
- many child agents
- optional deeper descendants
- explicit parent-child governance

The root authority is the origin of the tree.

It does not become root because another authority issued it or because a
verifier granted it root status. It is root by definition: it has no parent and
is the starting point from which child authority relationships are derived.

Long term the model may expand into an authority graph if the protocol adds:

- multi-party issuance
- overlapping authorities
- cross-delegation
- multisig-style governance

## Base Primitives

These remain canonical:

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(publicKey)`

These are cryptographic and identity derivation primitives. They are not the
complete protocol by themselves.

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

Signed governance objects use deterministic unsigned payload serialization.

Rules:

1. Remove the signature field before serialization.
2. Serialize fields in canonical schema order.
3. Omit fields that are `undefined`.
4. Preserve array order exactly.
5. Sort keys lexicographically for `metadata` and `constraints`.
6. Encode as UTF-8 JSON with no insignificant whitespace.

Use `canonicalizeGovernanceObjectForSigning(...)` to produce the payload.

## Verification Model

Verification is governed identity verification, not just key possession.

The verifier does not grant root status.

The verifier identifies the root authority object and then validates the
governance relationships that descend from it.

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

## Relying-Party Integration Profiles

The protocol is intended to support a small number of narrow, repeatable
integration patterns.

### Profile 1: Artifact Verification

A relying party receives CBIO proof material from an agent, validates it
locally, and then maps the verified agent identity into its own account or
policy model.

Typical result:

- create a new site account for the agent
- link the agent identity to an existing account
- assign a trust tier or capability set

### Profile 2: Online Verification

A relying party sends proof material to a CBIO verification service or trusted
adapter, then consumes the verification result in its own auth flow.

Typical result:

- trust a verification response
- create or update local identity linkage
- continue using existing sessions or tokens

### Profile 3: Signed Request Plus Identity Context

A relying party validates a CBIO identity chain and separately evaluates a
signed request or related request metadata.

Typical result:

- accept a request from a known agent identity
- apply site-defined authorization and abuse controls

These profiles are additive. None of them require a site to replace its
existing auth provider or authorization model.

## Artifact And Lifecycle Expectations

Any transport-level proof artifact built on this protocol should make the
following operational details explicit:

- what protocol version it relies on
- what identity or authority chain it asserts
- when it was issued
- when it expires, if expiration exists
- whether a relying party is expected to perform online revalidation
- how revocation affects the artifact's trust status

The protocol core defines identity and governance semantics first. Transport
artifacts and service-specific envelopes may evolve on top of that core, but
they should preserve these expectations.

## Stability And Conformance

The protocol is only useful as a shared trust substrate if independent
implementations can reach the same verification result.

For that reason:

- canonical object shapes must remain explicit
- signature inputs must remain deterministic
- versioning must distinguish stable from experimental behavior
- conformance tests and test vectors should be treated as part of the protocol surface

If a behavior is not clearly defined enough for another implementation to
reproduce, it is not yet mature enough to be treated as a stable protocol fact.

## References

- `src/protocol/identity.ts`
- `src/protocol/governance.ts`
- `tests/protocol/governance_objects.js`
