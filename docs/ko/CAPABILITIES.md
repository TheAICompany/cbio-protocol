# CBIO 역량 거버넌스

본 문서는 Claw-biometric (CBIO) 프로토콜의**역량 매트릭스**와 거버넌스 모델을 정의합니다. 거버넌스는 **ID 자율**과 **위임 역량**으로 달성됩니다.

---

## 1. 역할보다 ID

CBIO v1.0에는 "Admin"이나 "User" 같은 고정 "역할"이 없습니다. 모든 엔티티는 자체 암호 키와 vault를 갖는 1급 **ID**입니다.

다른 동작은 ID 핸들(CbioAgent)에 특정 **역량**을 위임하여 달성합니다.

| 엔티티 | 핸들 | 범위 | 주요 책임 |
| :--- | :--- | :--- | :--- |
| **Authority** | `CbioIdentity` | **루트** | 루트 설정, 발행, 전역 감사. |
| **Delegate** | `CbioAgent` | **범위** | 자동화, 네트워크 상호작용, 태스크 전용 로직. |

---

## 2. 역량 매트릭스

`CbioAgent` 핸들은 서명된 프로토콜 인증서 또는 명시적 런타임 할당을 통해 다음 역량을 동적으로 보유할 수 있습니다:

| 역량 | 관련 메서드 | 위험 수준 | 설명 |
| :--- | :--- | :--- | :--- |
| `vault:fetch` | `fetchWithAuth()` | 낮음 | 저장된 시크릿으로 네트워크 요청 인증. |
| `vault:list` | `listSecretNames()` | 낮음 | 이 핸들이 사용 가능한 시크릿 이름 열거. |
| `vault:acquire` | `fetchAndAddSecret()` | 중간 | 새 제3자 인증 정보 획득 및 프로비저닝. |
| `admin:secrets` | `agent.admin.xxx()` | 높음 | 시크릿 전체 관리(추가/삭제/업데이트). |
| `admin:issue` | `issueManagedAgent()` | **크리티컬** | 새 자식 ID 발행 및 거버넌스. |

---

## 3. 거버넌스 루프

SDK는 이 위임 역량의 수명 주기 관리를 위한 내장 메커니즘을 제공합니다.

### 3.1 인트로스펙션 (`can` 메서드)
에이전트는 **사전 점검**으로 안정성과 결정적 계획을 보장할 수 있습니다:
- `agent.can(capability)`: `boolean` 반환. 실행 전 전략을 적응하는 데 사용.
- `agent.permissions`: 현재 적용되는 제한의 읽기 전용 뷰.

### 3.2 Authority 자동 동기화
ID가 유효한 **IssuedAgentIdentity** 인증서를 보유하면, SDK는 인증서의 `capabilities` 필드에서 런타임 권한을 자동 도출합니다. "법적 부여"(인증서)와 "물리적 가드"(런타임 잠금) 간의 수동 동기화는 불필요합니다.

### 3.3 폐기
Authority는 네트워크 전체에서 위임 ID를 영구적으로 폐기할 수 있습니다:
- `identity.admin.revokeManagedAgent(pubKey)`: 서명된 **RevocationRecord** 발행.

---

## 4. 모범 사례

1. **실행 전 검증**: 자율 에이전트는 `can()`으로 자체 경계를 조회하고 우아한 폴백을 제공해야 합니다.
2. **최소 권한**: 특정 하위 프로세스에 필요한 원자 역량만 부여.
3. **감사 가시성**: `getManagedAgentCapabilities()`를 정기적으로 사용하여 활성 위임을 감사.
