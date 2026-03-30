# Claw-biometric プロトコル

本ドキュメントは Claw-biometric プロトコルの正式仕様です。

本リポジトリ内の他のドキュメントが、プロトコルの形状や検証セマンティクスにおいて本ファイルと異なる記述をしている場合、本ファイルを正とする。

Claw-biometric (c-bio) は、ガバナンスされたエージェント ID プロトコルです。

本プロトコルは ID ファーストです：

- すべてのエージェントはファーストクラスの ID
- ルートオーソリティ自体もエージェント ID
- 非ルートエージェントはオーソリティによる発行または委任によって存在する
- ID 間のガバナンス関係はプロトコル上で可視
- ランタイム vault は ID 所有権の帰結であり、プロトコルの中心ではない

本プロトコルは、ランタイムストレージ、CLI フロー、シークレット名プレフィックス、SDK 固有のエルゴノミクスを定義しません。

## 正式エントリポイント

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

vault のポータビリティ用 sealed blob ヘルパーは `@the-ai-company/agent-identity-sdk/migration` にあり、プロトコルモジュールには含まれません。

## モデル

当面のモデルはオーソリティツリーです：

- 1 つのルートオーソリティ
- 多数の子エージェント
- オプションの深層子孫
- 明示的な親子ガバナンス

ルートオーソリティはツリーの起点です。他のオーソリティによって発行されたから、または検証者がルート状態を付与したからルートになるわけではありません。定義上ルートであり、親を持たず、子オーソリティ関係の導出の出発点です。

将来的に、多方発行、重複オーソリティ、相互委任、マルチシグ型ガバナンスを追加する場合、モデルはオーソリティグラフへ拡張される可能性があります。

## 基本プリミティブ

以下は正式なプリミティブです：

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(publicKey)`

これらは暗号および ID 導出のプリミティブです。それ自体がプロトコルの全体ではありません。

## 正式オブジェクト

### AuthorityIdentity

```ts
interface AuthorityIdentity {
  cbio_protocol: 'v1.0';
  kind: 'authority_identity';
  authority: { agent_id, public_key, key_version };
}
```

`AuthorityIdentity` は起源オーソリティを識別します。発行結果ではありません。親オブジェクトも親署名も持たず、プロトコル上ではオーソリティツリーのルート起点を識別する役割を持ちます。

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

## 正式シリアライゼーション

署名付きガバナンスオブジェクトは、決定論的な未署名ペイロードシリアライゼーションを使用します。

ルール：1. シリアライズ前に署名フィールドを除去；2. スキーマ順でフィールドをシリアライズ；3. `undefined` フィールドは省略；4. 配列の順序を厳密に保持；5. `metadata` と `constraints` のキーは辞書順でソート；6. 空白なしの UTF-8 JSON でエンコード。

`canonicalizeGovernanceObjectForSigning(...)` を使用してペイロードを生成します。

## 検証モデル

検証は、鍵の所持のみではなく、ガバナンスされた ID の検証です。検証者はルート状態を付与しません。検証者はルートオーソリティオブジェクトを特定し、そこから派生するガバナンス関係を検証します。

各 ID 参照に対して：1. 公開鍵から agent id を導出；2. 宣言された agent id と比較；3. 不一致なら拒否。

発行済み ID、委任、失効に対して：1. 埋め込み ID 参照を検証；2. 未署名ペイロードを正規化；3. 署名を検証；4. 適用箇所で時間的有效性を強制。

オーソリティチェーンに対して：1. ルートオーソリティを検証；2. 発行済みエージェントを検証；3. 委任を検証；4. 失効を検証；5. 失効により無効化されたチェーンを拒否。

## 参照

- `src/protocol/identity.ts`
- `src/protocol/governance.ts`
- `tests/protocol/governance_objects.js`
