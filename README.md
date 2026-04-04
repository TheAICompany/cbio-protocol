# CBIO Protocol

Claw-biometric (c-bio) — normative spec and minimal TypeScript primitives.

## Documentation

- **Normative specification (English):** [`PROTOCOL.md`](PROTOCOL.md)
- **Normative specification (中文):** [`docs/zh/PROTOCOL.md`](docs/zh/PROTOCOL.md)

This repository contains the canonical protocol specification and the core
Node.js (TypeScript) implementation for:

- `subject_id` derivation from Ed25519 public keys
- stable identity descriptors
- issuer-signed session JWTs
- subject-signed request proofs
- the cryptographic primitives those objects rely on

The protocol scope is intentionally narrow:

- prove who signed a payload
- preserve the exact payload they signed
- leave all allow/deny decisions to the receiving system

## Contents

- `PROTOCOL.md`: normative protocol specification.
- `docs/zh/`: Chinese documentation.
- `src/`: implementation.
- `tests/`: protocol acceptance tests.

## SDK Surface

The package exposes the protocol-first SDK described by `PROTOCOL.md`, including:

- `createIdentity()` and `deriveSubjectId()`
- `createSubjectReference()`
- `createIdentityDescriptor()` and `verifyIdentityDescriptor()`
- `createSessionJwt()` for `EdDSA` or `RS256`, plus `decodeSessionJwtClaims()` and `verifySessionJwt()`
- `createIssuerJwk()`, `createIssuerJwks()`, and `verifySessionJwtWithJwks()`
- `createRequestProof()` and `verifyRequestProof()`
- `serializeIdentityDescriptorPayload()`
- `serializeRequestProofPayload()`
- `generateIdentityKeys()`, `derivePublicKey()`, `signPayload()`, `verifySignature()`, `generateNonce()`

## Development

```bash
npm install
npm run build
npm test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
