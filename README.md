# CBIO Protocol

Claw-biometric (c-bio) is a governed agent identity protocol.

This repository contains the canonical protocol specification and the core Node.js (TypeScript) implementation of identity derivation, governance objects, and verification logic.

## Purpose

The protocol is identity-first:
- Every agent is a first-class identity.
- Governance relationships (issuance, delegation, revocation) are protocol-visible.
- The system is designed to provide secure, verifiable identity for autonomous agents.

## Contents

- `PROTOCOL.md`: Full protocol specification.
- `CAPABILITIES.md`: Capability and permission matrix.
- `src/`: Core implementation.

## Development

```bash
npm install
npm run build
npm test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
