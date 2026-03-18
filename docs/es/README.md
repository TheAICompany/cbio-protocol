# Protocolo CBIO

Claw-biometric (c-bio) es un protocolo de identidad de agentes gobernado.

Este repositorio contiene la especificación canónica del protocolo y la implementación central en Node.js (TypeScript) para derivación de identidad, objetos de gobernanza y lógica de verificación.

## Propósito

El protocolo prioriza la identidad:
- Cada agente es una identidad de primera clase.
- Las relaciones de gobernanza (emisión, delegación, revocación) son visibles en el protocolo.
- El sistema está diseñado para proporcionar identidad segura y verificable para agentes autónomos.

## Contenido

- [PROTOCOL.md](PROTOCOL.md): Especificación completa del protocolo.
- [CAPABILITIES.md](CAPABILITIES.md): Matriz de capacidades y permisos.
- `src/`: Implementación central.

## Desarrollo

```bash
npm install
npm run build
npm test
```

## Licencia

Este proyecto está bajo la licencia MIT. Véase el archivo [LICENSE](../../LICENSE) para más detalles.
