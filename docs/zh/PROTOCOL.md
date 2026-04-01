# Claw-biometric 协议

Claw-biometric (c-bio) 的**规范性**说明。

若本仓库中其他文档与此文件在协议形态或验证语义上存在冲突，以本文件为准。

本规范定义密码学原语、`agent_id` 推导、有签名对象的 schema、规范序列化及验证步骤。不定义运行时存储、CLI、密钥前缀、SDK 人机工程或应用策略。

## 非目标（规范边界）

本规范不定义：

- 依赖方账户注册或授权逻辑
- 站点会话或令牌签发
- 计费、滥用治理或产品策略系统
- 以 CBIO 替代 OAuth、OIDC、JWT、API 密钥或托管认证产品

实现产生密钥、标识符与有签名对象之间可验证的绑定；依赖方自行决定如何使用验证结果。

验证结果如何与 OAuth、OIDC、站点会话或托管身份产品组合，属于**本规范范围之外**的集成问题。

## 规范入口点

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

保险库可移植的密封 blob 辅助函数位于 `@the-ai-company/agent-identity-sdk/migration`，不在协议模块中。

## 权威树（数据模型）

本规范中的有签名链对象假定有向树：

- 每条链恰有一个根：在该链中没有签发方父节点的权威。
- 子代理通过下文定义的有签名对象与父权威绑定。

除非未来版本扩展，实现**必须**将模型视为树，而非任意图。

## 基础原语

以下为规范性原语：

- `generateIdentityKeys()`
- `derivePublicKey(privateKey)`
- `signPayload(privateKey, payload)`
- `verifySignature(publicKey, signature, payload)`
- `deriveRootAgentId(publicKey)`

它们对完整链验证是必要但不充分的。

### 代理标识符（`agent_id`）

`deriveRootAgentId(publicKey)` 得到 `agent_id`，即根代理的规范性字符串标识（惯例前缀 `agt_`）。它由根公钥确定性推导。在可接受的公钥集合内，不同公钥**必须**映射到不同 `agent_id`。实现**不得**用本地存储路径或临时字符串前缀代替 `agent_id`。

## 规范对象

### AuthorityIdentity

```ts
interface AuthorityIdentity {
  cbio_protocol: 'v1.0';
  kind: 'authority_identity';
  authority: {
    agent_id: string;
    public_key: string;
    key_version: number;
  };
}
```

`AuthorityIdentity` 标识起源权威。它不是颁发结果，无父对象与父签名。其在协议中的作用是指明权威树的根。

### IssuedAgentIdentity

```ts
interface IssuedAgentIdentity {
  cbio_protocol: 'v1.0';
  kind: 'issued_agent_identity';
  agent: { agent_id: string; public_key: string; key_version: number };
  authority: { agent_id: string; public_key: string; key_version: number };
  issuance: { issued_at: string; expires_at?: string; sequence: number };
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
  issuer: { agent_id: string; public_key: string; key_version: number };
  delegate: { agent_id: string; public_key: string; key_version: number };
  delegation: {
    issued_at: string;
    expires_at?: string;
    capabilities: string[];
    constraints?: Record<string, string>;
    sequence: number;
  };
  issuer_signature: string;
}
```

### RevocationRecord

```ts
interface RevocationRecord {
  cbio_protocol: 'v1.0';
  kind: 'revocation_record';
  issuer: { agent_id: string; public_key: string; key_version: number };
  target: {
    kind: 'issued_agent_identity' | 'delegation_certificate';
    subject_agent_id: string;
    sequence: number;
  };
  revocation: { revoked_at: string; reason?: string };
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

## 规范序列化

本规范定义的有签名对象对无签名载荷使用确定性序列化。

规则：1. 序列化前移除签名字段；2. 按规范 schema 顺序序列化字段；3. 省略 `undefined` 字段；4. 严格保持数组顺序；5. `metadata` 与 `constraints` 的键按字典序排序；6. 以无多余空白的 UTF-8 JSON 编码。

使用 `canonicalizeGovernanceObjectForSigning(...)` 生成载荷。

## 验证模型

验证方校验密钥与标识符的绑定，并在存在时校验有签名链对象。验证方不按策略「授予」根身份；其检查声明的根对象符合 schema 且在该链中无签发方父节点。

对每个身份引用：1. 由公钥推导 agent id；2. 与声明的 agent id 比较；3. 不匹配则拒绝。

对已颁发身份、委派与撤销：1. 校验嵌入的身份引用；2. 规范化无签名载荷；3. 验证签名；4. 在适用处强制执行时间有效性。

对权威链：1. 验证根权威；2. 验证已颁发代理；3. 验证委派；4. 验证撤销；5. 拒绝已被撤销作废的链。

## 依赖方集成（模式）

以下为常见部署的**描述性**名称，不在上文验证规则之外增加要求。

### 模式 1：工件验证

依赖方在本地校验证明材料，再在自有账户或策略存储中使用结果。

### 模式 2：在线验证

依赖方从服务取得验证结果，再继续自有认证流程。

### 模式 3：带身份上下文的已签名请求

依赖方将链对象校验与请求签名分开处理。

## 工件与生命周期预期

传输封装宜标明：协议版本；所断言的身份或链；签发时间；可选过期；是否期望在线再校验；撤销对信任状态的影响。

## 稳定性与一致性

独立实现对相同输入须得到相同验证结果。因此：

- 规范对象形态与签名输入保持显式且带版本
- 一致性测试与测试向量属于协议表面

若某行为未精确到可跨实现复现，则尚不构成稳定协议事实。

## 参考

- `src/identity.ts`
- `src/crypto.ts`
