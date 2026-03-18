# Protocolo CBIO

Claw-biometric (c-bio) é um protocolo de identidade de agentes governado.

Este repositório contém a especificação canônica do protocolo e a implementação central em Node.js (TypeScript) para derivação de identidade, objetos de governança e lógica de verificação.

## Propósito

O protocolo é orientado à identidade:
- Cada agente é uma identidade de primeira classe.
- Relações de governança (emissão, delegação, revogação) são visíveis no protocolo.
- O sistema é projetado para fornecer identidade segura e verificável para agentes autônomos.

## Conteúdo

- [PROTOCOL.md](PROTOCOL.md): Especificação completa do protocolo.
- [CAPABILITIES.md](CAPABILITIES.md): Matriz de capacidades e permissões.
- `src/`: Implementação central.

## Desenvolvimento

```bash
npm install
npm run build
npm test
```

## Licença

Este projeto está licenciado sob a MIT License. Veja o arquivo [LICENSE](../../LICENSE) para detalhes.
