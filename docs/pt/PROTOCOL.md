# Protocolo Claw-biometric

Este documento é a especificação canônica do protocolo Claw-biometric.

Se qualquer outro documento neste repositório diferir deste arquivo na forma do protocolo ou na semântica de verificação, este arquivo é a fonte da verdade.

Claw-biometric (c-bio) é um protocolo de identidade de agentes governado.

O protocolo é orientado à identidade:

- cada agente é uma identidade de primeira classe
- uma autoridade raiz é ela própria uma identidade de agente
- agentes não raiz existem porque uma autoridade os emitiu ou delegou
- relações de governança entre identidades são visíveis no protocolo
- vaults em tempo de execução são consequências da propriedade de identidade, não o centro do protocolo

O protocolo não define armazenamento em tempo de execução, fluxos CLI, prefixos de nomes de segredos ou ergonomia específica do SDK.

## Ponto de entrada canônico

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

Auxiliares de blob selado para portabilidade do vault estão em `@the-ai-company/agent-identity-sdk/migration`, não no módulo de protocolo.

## Modelo

O modelo de curto prazo é uma árvore de autoridades:

- uma autoridade raiz
- muitos agentes filhos
- descendentes mais profundos opcionais
- governança explícita pai-filho

A autoridade raiz é a origem da árvore. Ela não se torna raiz porque outra autoridade a emitiu ou porque um verificador concedeu status raiz. Ela é raiz por definição: não tem pai e é o ponto de partida a partir do qual relações de autoridade filhas são derivadas.

A longo prazo o modelo pode expandir para um grafo de autoridades se o protocolo adicionar:

- emissão multipartes
- autoridades sobrepostas
- delegação cruzada
- governança tipo multisig

## Primitivas base

Estas permanecem canônicas:

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(publicKey)`

São primitivas criptográficas e de derivação de identidade. Não constituem o protocolo completo por si mesmas.

## Objetos canônicos

### AuthorityIdentity

```ts
interface AuthorityIdentity {
  cbio_protocol: 'v1.0';
  kind: 'authority_identity';
  authority: { agent_id, public_key, key_version };
}
```

`AuthorityIdentity` identifica uma autoridade de origem. Não é um resultado de emissão. Não tem objeto pai nem assinatura pai. Seu papel no protocolo é identificar a raiz a partir da qual uma árvore de autoridades começa.

### IssuedAgentIdentity

```ts
interface IssuedAgentIdentity {
  cbio_protocol: 'v1.0';
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
  cbio_protocol: 'v1.0';
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
  cbio_protocol: 'v1.0';
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
  cbio_protocol: 'v1.0';
  kind: 'authority_chain';
  authority_root: AuthorityIdentity;
  issued_agent: IssuedAgentIdentity;
  delegations?: DelegationCertificate[];
  revocations?: RevocationRecord[];
}
```

## Serialização canônica

Objetos de governança assinados usam serialização determinística de payload sem assinatura.

Regras: 1. Remover campo de assinatura antes de serializar; 2. Serializar campos na ordem canônica do esquema; 3. Omitir campos `undefined`; 4. Preservar ordem de arrays exatamente; 5. Ordenar chaves lexicograficamente para `metadata` e `constraints`; 6. Codificar como JSON UTF-8 sem espaços em branco insignificantes.

Usar `canonicalizeGovernanceObjectForSigning(...)` para produzir o payload.

## Modelo de verificação

A verificação é verificação de identidade governada, não apenas posse de chave. O verificador não concede status raiz. O verificador identifica o objeto de autoridade raiz e então valida as relações de governança que descendem dele.

Para cada referência de identidade: 1. derivar agent id da chave pública; 2. comparar com agent id declarado; 3. rejeitar se não coincidirem.

Para identidades emitidas, delegações e revogações: 1. validar referências de identidade embutidas; 2. canonizar o payload sem assinatura; 3. verificar a assinatura; 4. fazer cumprir validade temporal quando aplicável.

Para cadeias de autoridade: 1. validar autoridade raiz; 2. validar agente emitido; 3. validar delegações; 4. validar revogações; 5. rejeitar cadeias invalidadas por revogação.

## Referências

- `src/protocol/identity.ts`
- `src/protocol/governance.ts`
- `tests/protocol/governance_objects.js`
