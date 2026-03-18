# Protocole Claw-biometric

Ce document est la spécification canonique du protocole Claw-biometric.

Si tout autre document de ce dépôt diffère de ce fichier sur la forme du protocole ou la sémantique de vérification, ce fichier fait autorité.

Claw-biometric (c-bio) est un protocole d'identité d'agents gouverné.

Le protocole est centré sur l'identité :

- chaque agent est une identité de première classe
- une autorité racine est elle-même une identité d'agent
- les agents non racine existent parce qu'une autorité les a émis ou délégués
- les relations de gouvernance entre identités sont visibles dans le protocole
- les vaults d'exécution sont des conséquences de la propriété d'identité, non le centre du protocole

Le protocole ne définit pas le stockage d'exécution, les flux CLI, les préfixes de noms de secrets ou l'ergonomie spécifique du SDK.

## Point d'entrée canonique

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

Les helpers de blob scellé pour la portabilité du vault sont dans `@the-ai-company/agent-identity-sdk/migration`, pas dans le module protocole.

## Modèle

Le modèle à court terme est un arbre d'autorités :

- une autorité racine
- de nombreux agents enfants
- des descendants plus profonds optionnels
- une gouvernance explicite parent-enfant

L'autorité racine est l'origine de l'arbre. Elle ne devient pas racine parce qu'une autre autorité l'a émise ou qu'un vérificateur lui a accordé le statut racine. Elle est racine par définition : elle n'a pas de parent et est le point de départ à partir duquel les relations d'autorité filles sont dérivées.

À long terme, le modèle peut s'étendre à un graphe d'autorités si le protocole ajoute :

- une émission multipartite
- des autorités qui se chevauchent
- une délégation croisée
- une gouvernance de type multisig

## Primitives de base

Ces primitives restent canoniques :

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(publicKey)`

Ce sont des primitives cryptographiques et de dérivation d'identité. Elles ne constituent pas à elles seules le protocole complet.

## Objets canoniques

### AuthorityIdentity

```ts
interface AuthorityIdentity {
  cbio_protocol: 'v3.0';
  kind: 'authority_identity';
  authority: { agent_id, public_key, key_version };
}
```

`AuthorityIdentity` identifie une autorité d'origine. Ce n'est pas un résultat d'émission. Elle n'a pas d'objet parent ni de signature parente. Son rôle dans le protocole est d'identifier la racine à partir de laquelle commence un arbre d'autorités.

### IssuedAgentIdentity

```ts
interface IssuedAgentIdentity {
  cbio_protocol: 'v3.0';
  kind: 'issued_agent_identity';
  agent: { agent_id, public_key, key_version };
  authority: { agent_id, public_key, key_version };
  issuance: { issued_at, expires_at?, sequence };
  capabilities?: string[];
  metadata?: Record<string, string>;
  authority_signature: string;
}
```

### DelegationCertificate

```ts
interface DelegationCertificate {
  cbio_protocol: 'v3.0';
  kind: 'delegation_certificate';
  issuer: { agent_id, public_key, key_version };
  delegate: { agent_id, public_key, key_version };
  delegation: { issued_at, expires_at?, capabilities, constraints?, sequence };
  issuer_signature: string;
}
```

### RevocationRecord

```ts
interface RevocationRecord {
  cbio_protocol: 'v3.0';
  kind: 'revocation_record';
  issuer: { agent_id, public_key, key_version };
  target: { kind, subject_agent_id, sequence };
  revocation: { revoked_at, reason? };
  issuer_signature: string;
}
```

### AuthorityChain

```ts
interface AuthorityChain {
  cbio_protocol: 'v3.0';
  kind: 'authority_chain';
  authority_root: AuthorityIdentity;
  issued_agent: IssuedAgentIdentity;
  delegations?: DelegationCertificate[];
  revocations?: RevocationRecord[];
}
```

## Sérilization canonique

Les objets de gouvernance signés utilisent une sérialisation déterministe de payload sans signature.

Règles : 1. Supprimer le champ signature avant sérialisation ; 2. Sérialiser les champs dans l'ordre canonique du schéma ; 3. Omettre les champs `undefined` ; 4. Préserver exactement l'ordre des tableaux ; 5. Trier les clés lexicographiquement pour `metadata` et `constraints` ; 6. Encoder en JSON UTF-8 sans espaces blancs insignifiants.

Utiliser `canonicalizeGovernanceObjectForSigning(...)` pour produire le payload.

## Modèle de vérification

La vérification est une vérification d'identité gouvernée, pas seulement la possession de clé. Le vérificateur n'accorde pas le statut racine. Le vérificateur identifie l'objet autorité racine puis valide les relations de gouvernance qui en descendent.

Pour chaque référence d'identité : 1. dériver agent id de la clé publique ; 2. comparer à l'agent id déclaré ; 3. rejeter en cas de non-correspondance.

Pour les identités émises, délégations et révocations : 1. valider les références d'identité embarquées ; 2. canoniser le payload sans signature ; 3. vérifier la signature ; 4. appliquer la validité temporelle le cas échéant.

Pour les chaînes d'autorité : 1. valider l'autorité racine ; 2. valider l'agent émis ; 3. valider les délégations ; 4. valider les révocations ; 5. rejeter les chaînes invalidées par révocation.

## Références

- `src/protocol/identity.ts`
- `src/protocol/governance.ts`
- `tests/protocol/governance_objects.js`
