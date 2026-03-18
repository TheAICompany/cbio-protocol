# Claw-biometric 协议

本文档为 Claw-biometric 协议的规范定义。

若本仓库中其他文档与此文件在协议形态或验证语义上存在冲突，以本文件为准。

Claw-biometric (c-bio) 是一种受治理的代理身份协议。

本协议以身份为首要原则：

- 每个代理都是一等公民身份
- 根权威本身也是一个代理身份
- 非根代理因权威的颁发或委派而存在
- 身份之间的治理关系对协议可见
- 运行时保险库是身份所有权的衍生产物，而非协议核心

本协议不定义运行时存储、CLI 流程、密钥名称前缀或 SDK 特定的人机工程。

## 规范入口点

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

保险库可移植的密封 blob 辅助函数位于 `@the-ai-company/agent-identity-sdk/migration`，不在协议模块中。

## 模型

近期模型为权威树：

- 一个根权威
- 多个子代理
- 可选的更深层级后代
- 显式的父子治理关系

根权威是树的起源。它不会因为被其他权威颁发或被验证者授予根状态而成为根。根权威是定义的：它没有父节点，是子权威关系的推导起点。

长期而言，若协议引入多方颁发、重叠权威、交叉委派或多签式治理，模型可能扩展为权威图。

## 基础原语

以下为规范原语：

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(publicKey)`

这些是加密与身份推导原语，本身不构成完整协议。

## 规范对象

### AuthorityIdentity

```ts
interface AuthorityIdentity {
  cbio_protocol: 'v3.0';
  kind: 'authority_identity';
  authority: {
    agent_id: string;
    public_key: string;
    key_version: number;
  };
}
```

`AuthorityIdentity` 标识一个起源权威。它不是颁发结果，没有父对象和父签名。其在协议中的作用是标识权威树的根起点。

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

## 规范序列化

签名的治理对象使用确定性无签名载荷序列化。

规则：1. 序列化前移除签名字段；2. 按规范 schema 顺序序列化字段；3. 省略 `undefined` 字段；4. 严格保持数组顺序；5. `metadata` 与 `constraints` 按字典序排序键；6. 以无空白 UTF-8 JSON 编码。

使用 `canonicalizeGovernanceObjectForSigning(...)` 生成载荷。

## 验证模型

验证针对受治理身份，而非仅密钥持有。验证者不授予根状态。验证者识别根权威对象，然后验证从其派生的治理关系。

对每个身份引用：1. 从公钥推导 agent id；2. 与声明的 agent id 比较；3. 不匹配则拒绝。

对已颁发身份、委派和撤销：1. 验证嵌入的身份引用；2. 规范化无签名载荷；3. 验证签名；4. 在适用处强制执行时间有效性。

对权威链：1. 验证根权威；2. 验证已颁发代理；3. 验证委派；4. 验证撤销；5. 拒绝被撤销作废的链。

## 参考

- `src/protocol/identity.ts`
- `src/protocol/governance.ts`
- `tests/protocol/governance_objects.js`
