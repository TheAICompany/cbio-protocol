# Protocole CBIO

Claw-biometric (c-bio) est un protocole d'identité d'agents gouverné.

Ce dépôt contient la spécification canonique du protocole et l'implémentation centrale Node.js (TypeScript) pour la dérivation d'identité, les objets de gouvernance et la logique de vérification.

## Objectif

Le protocole est centré sur l'identité :
- Chaque agent est une identité de première classe.
- Les relations de gouvernance (émission, délégation, révocation) sont visibles dans le protocole.
- Le système est conçu pour fournir une identité sécurisée et vérifiable aux agents autonomes.

## Contenu

- [PROTOCOL.md](PROTOCOL.md) : Spécification complète du protocole.
- [CAPABILITIES.md](CAPABILITIES.md) : Matrice des capacités et permissions.
- `src/` : Implémentation centrale.

## Développement

```bash
npm install
npm run build
npm test
```

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](../../LICENSE) pour les détails.
