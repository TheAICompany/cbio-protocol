# CBIO 프로토콜

Claw-biometric (c-bio)는 거버넌스된 에이전트 ID 프로토콜입니다.

본 저장소에는 ID 파생, 거버넌스 객체, 검증 로직의 규격 및 Node.js (TypeScript) 코어 구현이 포함됩니다.

## 목적

본 프로토콜은 ID 우선입니다:

- 모든 에이전트는 1급 ID입니다.
- 거버넌스 관계(발행, 위임, 폐기)는 프로토콜 상에서 가시적입니다.
- 자율 에이전트를 위한 안전하고 검증 가능한 ID를 제공하도록 설계되었습니다.

## 내용

- [PROTOCOL.md](PROTOCOL.md): 전체 프로토콜 규격.
- [CAPABILITIES.md](CAPABILITIES.md): 역량 및 권한 매트릭스.
- `src/`: 코어 구현.

## 개발

```bash
npm install
npm run build
npm test
```

## 라이선스

본 프로젝트는 MIT 라이선스입니다. 자세한 내용은 [LICENSE](../../LICENSE)를 참조하세요.
