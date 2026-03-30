# Claw-biometric 프로토콜

본 문서는 Claw-biometric 프로토콜의 공식 규격입니다.

본 저장소 내 다른 문서가 프로토콜 형태 또는 검증 시맨틱에서 본 파일과 다를 경우, 본 파일을 우선합니다.

Claw-biometric (c-bio)는 거버넌스된 에이전트 ID 프로토콜입니다.

본 프로토콜은 ID 우선입니다:

- 모든 에이전트는 1급 ID
- 루트 Authority 자체도 에이전트 ID
- 비루트 에이전트는 Authority의 발행 또는 위임으로 존재
- ID 간 거버넌스 관계는 프로토콜 상에서 가시적
- 런타임 vault는 ID 소유의 결과이며, 프로토콜의 중심이 아님

본 프로토콜은 런타임 저장소, CLI 흐름, 시크릿 이름 접두사, SDK 특화 에르고노믹스를 정의하지 않습니다.

## 공식 진입점

```ts
import {
  deriveRootAgentId,
  createIdentity,
  generateNonce,
  signPayload,
  verifySignature,
  generateIdentityKeys,
  derivePublicKey,
} from '@the-ai-company/agent-identity-sdk/protocol';

```

vault 이식성용 sealed blob 헬퍼는 `@the-ai-company/agent-identity-sdk/migration`에 있으며, 프로토콜 모듈에 포함되지 않습니다.

## 모델

단기 모델은 Authority 트리입니다:

- 하나의 루트 Authority
- 여러 자식 에이전트
- 선택적 심층 자손
- 명시적 부모-자식 거버넌스

루트 Authority는 트리의 기원입니다. 다른 Authority가 발행했거나 검증자가 루트 상태를 부여해서 루트가 되는 것이 아닙니다. 정의상 루트이며, 부모가 없고 자식 Authority 관계의 도출 출발점입니다.

장기적으로, 다자 발행, 중첩 Authority, 상호 위임, 멀티시그형 거버넌스를 추가하면 모델이 Authority 그래프로 확장될 수 있습니다.

## 기본 원시

다음은 공식 원시입니다:

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(publicKey)`

이는 암호 및 ID 도출 원시이며, 그 자체로 프로토콜 전체가 아닙니다.

## 공식 객체

### AuthorityIdentity

```ts
interface AuthorityIdentity {
  cbio_protocol: 'v1.0';
  kind: 'authority_identity';
  authority: { agent_id, public_key, key_version };
}
```

`AuthorityIdentity`는 기원 Authority를 식별합니다. 발행 결과가 아니며, 부모 객체와 부모 서명이 없습니다. 프로토콜상 Authority 트리의 루트 출발점을 식별하는 역할을 합니다.

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

## 공식 직렬화

서명된 거버넌스 객체는 결정적 비서명 페이로드 직렬화를 사용합니다.

규칙: 1. 직렬화 전 서명 필드 제거; 2. 스키마 순서로 필드 직렬화; 3. `undefined` 필드 생략; 4. 배열 순서 정확히 유지; 5. `metadata` 및 `constraints`의 키를 사전순 정렬; 6. 공백 없는 UTF-8 JSON으로 인코딩.

`canonicalizeGovernanceObjectForSigning(...)`로 페이로드를 생성합니다.

## 검증 모델

검증은 단순 키 소유가 아니라 거버넌스된 ID 검증입니다. 검증자는 루트 상태를 부여하지 않습니다. 검증자는 루트 Authority 객체를 식별한 후, 그로부터 파생된 거버넌스 관계를 검증합니다.

각 ID 참조에 대해: 1. 공개키에서 agent id 도출; 2. 선언된 agent id와 비교; 3. 불일치 시 거부.

발행된 ID, 위임, 폐기에 대해: 1. 임베디드 ID 참조 검증; 2. 비서명 페이로드 정규화; 3. 서명 검증; 4. 적용 가능 시 시간 유효성 강제.

Authority 체인에 대해: 1. 루트 Authority 검증; 2. 발행된 에이전트 검증; 3. 위임 검증; 4. 폐기 검증; 5. 폐기로 무효화된 체인 거부.

## 참고

- `src/protocol/identity.ts`
- `src/protocol/governance.ts`
- `tests/protocol/governance_objects.js`
