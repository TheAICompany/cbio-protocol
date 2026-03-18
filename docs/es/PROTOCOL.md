# Protocolo Claw-biometric

Este documento es la especificación canónica del protocolo Claw-biometric.

Si cualquier otro documento en este repositorio difiere de este archivo en la forma del protocolo o la semántica de verificación, este archivo es la fuente de verdad.

Claw-biometric (c-bio) es un protocolo de identidad de agentes gobernado.

El protocolo prioriza la identidad:

- cada agente es una identidad de primera clase
- una autoridad raíz es ella misma una identidad de agente
- los agentes no raíz existen porque una autoridad los emitió o delegó
- las relaciones de gobernanza entre identidades son visibles en el protocolo
- los vaults en tiempo de ejecución son consecuencias de la propiedad de identidad, no el centro del protocolo

El protocolo no define almacenamiento en tiempo de ejecución, flujos CLI, prefijos de nombres de secretos o ergonomía específica del SDK.

## Punto de entrada canónico

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

Los ayudantes de blob sellado para portabilidad del vault están en `@the-ai-company/agent-identity-sdk/migration`, no en el módulo de protocolo.

## Modelo

El modelo a corto plazo es un árbol de autoridades:

- una autoridad raíz
- muchos agentes hijos
- descendientes más profundos opcionales
- gobernanza explícita padre-hijo

La autoridad raíz es el origen del árbol. No se vuelve raíz porque otra autoridad la emitió o porque un verificador le otorgó estado raíz. Es raíz por definición: no tiene padre y es el punto de partida desde el cual se derivan las relaciones de autoridad hijas.

A largo plazo el modelo puede expandirse a un grafo de autoridades si el protocolo añade:

- emisión multipartita
- autoridades superpuestas
- delegación cruzada
- gobernanza tipo multisig

## Primitivas base

Estas permanecen canónicas:

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(publicKey)`

Son primitivas criptográficas y de derivación de identidad. No constituyen el protocolo completo por sí mismas.

## Objetos canónicos

### AuthorityIdentity

```ts
interface AuthorityIdentity {
  cbio_protocol: 'v3.0';
  kind: 'authority_identity';
  authority: { agent_id, public_key, key_version };
}
```

`AuthorityIdentity` identifica una autoridad de origen. No es un resultado de emisión. No tiene objeto padre ni firma padre. Su papel en el protocolo es identificar la raíz desde la cual comienza un árbol de autoridades.

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

## Serialización canónica

Los objetos de gobernanza firmados usan serialización determinista de payload sin firma.

Reglas: 1. Eliminar el campo de firma antes de serializar; 2. Serializar campos en orden canónico del esquema; 3. Omitir campos `undefined`; 4. Preservar exactamente el orden de arrays; 5. Ordenar claves lexicográficamente para `metadata` y `constraints`; 6. Codificar como JSON UTF-8 sin espacios en blanco insignificantes.

Usar `canonicalizeGovernanceObjectForSigning(...)` para producir el payload.

## Modelo de verificación

La verificación es verificación de identidad gobernada, no solo posesión de clave. El verificador no otorga estado raíz. El verificador identifica el objeto de autoridad raíz y luego valida las relaciones de gobernanza que descienden de él.

Para cada referencia de identidad: 1. derivar agent id de la clave pública; 2. comparar con agent id declarado; 3. rechazar si no coinciden.

Para identidades emitidas, delegaciones y revocaciones: 1. validar referencias de identidad embebidas; 2. canonizar el payload sin firma; 3. verificar la firma; 4. hacer cumplir validez temporal cuando aplique.

Para cadenas de autoridad: 1. validar autoridad raíz; 2. validar agente emitido; 3. validar delegaciones; 4. validar revocaciones; 5. rechazar cadenas invalidadas por revocación.

## Referencias

- `src/protocol/identity.ts`
- `src/protocol/governance.ts`
- `tests/protocol/governance_objects.js`
