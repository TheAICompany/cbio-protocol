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

## Canonical Entry Point

```ts
import {
  deriveRootAgentId,
  generateIdentityKeys,
  derivePublicKey,
  signPayload,
  verifySignature,
  createIdentityRef,
  createAuthorityIdentity,
  canonicalizeGovernanceObjectForSigning,
  signIssuedAgentIdentity,
  signDelegationCertificate,
  signRevocationRecord,
  verifyGovernanceIdentityRef,
  verifyAuthorityIdentity,
  verifyIssuedAgentIdentity,
  verifyDelegationCertificate,
  verifyRevocationRecord,
  verifyAuthorityChain,
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

## References

- `src/protocol/identity.ts`
- `src/protocol/governance.ts`
- `tests/protocol/governance_objects.js`
