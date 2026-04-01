# CBIO Protocol

Claw-biometric (c-bio) — normative spec and minimal TypeScript primitives.

## Documentation

- **Normative specification (English):** [`PROTOCOL.md`](PROTOCOL.md)
- **Normative specification (中文):** [`docs/zh/PROTOCOL.md`](docs/zh/PROTOCOL.md)

This repository contains the canonical protocol specification and the core
Node.js (TypeScript) implementation: identity derivation and cryptographic
primitives (`src/`).

## Contents

- `PROTOCOL.md`: normative protocol specification.
- `CAPABILITIES.md`: capability matrix (English); [`docs/zh/CAPABILITIES.md`](docs/zh/CAPABILITIES.md) (中文).
- `docs/zh/`: Chinese README and protocol copy only.
- `src/`: implementation.

## Development

```bash
npm install
npm run build
npm test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
