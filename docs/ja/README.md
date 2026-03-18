# CBIO プロトコル

Claw-biometric (c-bio) は、ガバナンスされたエージェント ID プロトコルです。

本リポジトリには、ID 導出、ガバナンスオブジェクト、検証ロジックの仕様と、Node.js (TypeScript) によるコア実装が含まれます。

## 目的

本プロトコルは ID ファーストです：

- すべてのエージェントはファーストクラスの ID です。
- ガバナンス関係（発行、委任、失効）はプロトコル上で可視です。
- 自律エージェント向けの安全で検証可能な ID を提供することを目的としています。

## 内容

- [PROTOCOL.md](PROTOCOL.md): プロトコル仕様。
- [CAPABILITIES.md](CAPABILITIES.md): 機能・権限マトリクス。
- `src/`: コア実装。

## 開発

```bash
npm install
npm run build
npm test
```

## ライセンス

本プロジェクトは MIT ライセンスです。詳細は [LICENSE](../../LICENSE) を参照してください。
