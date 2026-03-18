# CBIO 能力治理

本文档定义 Claw-biometric (CBIO) 协议的**能力矩阵**与治理模型。治理通过**身份自主**与**委派能力**实现。

---

## 1. 身份优于角色

在 CBIO v1.0 中，没有固定的「角色」（如 Admin 或 User）。每个实体都是一等**身份**，拥有自己的加密密钥与保险库。

不同操作行为通过向身份句柄 (CbioAgent) 委派特定**能力**实现。

| 实体 | 句柄 | 范围 | 主要职责 |
| :--- | :--- | :--- | :--- |
| **Authority** | `CbioIdentity` | **根** | 根配置、颁发与全局审计。 |
| **Delegate** | `CbioAgent` | **作用域** | 自动化、网络交互与任务特定逻辑。 |

---

## 2. 能力矩阵

`CbioAgent` 句柄可通过签名协议证书或显式运行时分配，动态拥有以下能力：

| 能力 | 关联方法 | 风险级别 | 描述 |
| :--- | :--- | :--- | :--- |
| `vault:fetch` | `fetchWithAuth()` | 低 | 使用存储密钥对网络请求进行认证。 |
| `vault:list` | `listSecretNames()` | 低 | 枚举此句柄可用的密钥名称。 |
| `vault:acquire` | `fetchAndAddSecret()` | 中 | 获取并配置新的第三方凭证。 |
| `admin:secrets` | `agent.admin.xxx()` | 高 | 对密钥进行完整管理（增/删/改）。 |
| `admin:issue` | `issueManagedAgent()` | **关键** | 颁发并治理新的子身份。 |

---

## 3. 治理循环

SDK 提供内置机制，用于管理这些委派能力的生命周期。

### 3.1 自省（`can` 方法）
代理可执行**预检**以确保稳定与确定性规划：
- `agent.can(capability)`：返回 `boolean`。在执行前用于调整策略。
- `agent.permissions`：当前强制限制的只读视图。

### 3.2 权威自动同步
若身份持有有效的 **IssuedAgentIdentity** 证书，SDK 会从证书的 `capabilities` 字段自动推导运行时权限。无需在「法律授予」（证书）与「物理防护」（运行时锁）之间手动同步。

### 3.3 撤销
权威可在全网永久撤销委派身份：
- `identity.admin.revokeManagedAgent(pubKey)`：签发签名的 **RevocationRecord**。

---

## 4. 最佳实践

1. **执行前验证**：自主代理应使用 `can()` 查询自身边界并提供优雅回退。
2. **最小权限**：仅授予特定子流程所需的原子能力。
3. **审计可见性**：定期使用 `getManagedAgentCapabilities()` 审计活跃委派。
