# CBIO Protocol

Claw-biometric (c-bio) — normative spec and minimal TypeScript primitives.

## Documentation

- **Normative specification (English):** [`PROTOCOL.md`](PROTOCOL.md)
- **Normative specification (中文):** [`docs/zh/PROTOCOL.md`](docs/zh/PROTOCOL.md)

This repository contains the canonical protocol specification and the core
Node.js (TypeScript) implementation for:

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

- `createIdentity()`
- `createSubjectRef()`, `parseSubjectRef()`, and `isValidSubjectRef()`
- `createSubjectReference()`
- `createIdentityDescriptor()` and `verifyIdentityDescriptor()`
- `createSessionJwt()` for `EdDSA` or `RS256`, plus `decodeSessionJwtClaims()` and `verifySessionJwt()`
- `createIssuerJwk()`, `createIssuerJwks()`, and `verifySessionJwtWithJwks()`
- `createRequestProof()` and `verifyRequestProof()`
- `serializeIdentityDescriptorPayload()`
- `serializeRequestProofPayload()`
- `generateIdentityKeys()`, `derivePublicKey()`, `signPayload()`, `verifySignature()`, `generateNonce()`

Browser/runtime split:

- The default Node entry exports the full SDK above.
- The package `browser` condition exports only session JWT and JWKS helpers.
- Identity creation, direct key operations, and request signing remain Node-side responsibilities unless a browser-specific implementation is provided separately.

## Development

```bash
npm install
npm run build
npm test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
