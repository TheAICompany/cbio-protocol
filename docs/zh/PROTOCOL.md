# Claw-biometric 协议

Claw-biometric (c-bio) 的规范性说明。

若本仓库中其他文档与此文件在协议形态或验证语义上存在冲突，以本文件为准。

CBIO 定义了一套同时覆盖 human 与 agent 的统一身份协议。依赖方只识别一种稳定主体标识格式。`species` 与 `kind` 一类字段只是描述性标签，不构成独立身份体系。

协议只回答三件事：

1. 你是谁
2. 你最近是否完成认证
3. 这条请求是不是你签的

这三件事对应三层协议对象：

- 长期稳定身份
- 有时效的 session JWT
- 单次请求 proof

长期身份还可以带一个可选的 `parent` 链接，用来把主体向上追溯到更早的主体。这解决的是身份来源问题，不是授权问题。

授权始终由接收方本地决定。

## 密码学原语

以下为规范性原语：

- 生成新的 Ed25519 密钥对
- 由私钥推导公钥
- 对载荷生成 Ed25519 分离签名
- 针对载荷验证 Ed25519 分离签名

对于 `IdentityDescriptor` 与 `RequestProof`，`public_key` 表示主体的验证公钥，其编码形式为 base64url 包装的 SPKI DER 字节。

### 主体引用（`subject_ref`）

`subject_ref` 是主体公钥的自描述交换格式。

版本 `v1` 使用以下字符串格式：

```text
cbio:v1:sub:ed25519:spki-b64u:<key>
```

其中：

- `cbio` 是固定协议前缀
- `v1` 是协议版本
- `sub` 表示主体引用类型
- `ed25519` 是密钥算法
- `spki-b64u` 是密钥编码方式
- `<key>` 是 base64url 包装的 SPKI DER 公钥字节

规范性说明：

- `subject_ref` 是 `public_key` 的便携包装，不是另一套身份体系。
- 能理解 `subject_ref` 的验证方必须能从中恢复出完全一致的 `public_key`。
- 协议对象可以携带 `public_key`、`subject_ref` 或同时携带两者；只要验证所需信息充分，且重复值彼此一致即可。

## 第一层：长期稳定身份

### 对象：`IdentityDescriptor`

必填字段：

- `cbio_protocol`：字符串，固定值 `v1.0`
- `kind`：字符串，固定值 `identity_descriptor`
- `subject`：对象
- `subject.public_key`：字符串

可选字段：

- `subject.subject_ref`：字符串
- `subject.species`：字符串
- `subject.kind_label`：字符串
- `subject.parent`：对象
- `subject.parent.subject_ref`：字符串
- `subject.parent.public_key`：字符串
- `subject.parent_signature`：字符串
- `subject.metadata`：对象，键和值均为字符串

`IdentityDescriptor` 将稳定标识绑定到公钥。它只回答“这个主体是谁”。

规范性说明：

- `species` 与 `kind_label` 只是描述性标签。
- 若存在 `subject.subject_ref`，它必须能解码出与 `subject.public_key` 完全一致的公钥。
- 若存在 `subject.parent`，它声明该主体直接来源于哪个上级主体，用于可追溯性。
- 若存在 `subject.parent.subject_ref`，它必须能解码出与 `subject.parent.public_key` 完全一致的公钥。
- 若存在 `subject.parent_signature`，它表示父主体对无签名 `IdentityDescriptor` 载荷产生的分离签名。
- 依赖方不得把 `species` 或 `kind_label` 视为协议替它给出的授权结论。
- human 与 agent 共用同一套标识格式与验证规则。
- parent 链接只提供 provenance。是否接受某条 ancestry chain，始终由接收方自行决定。

## 第二层：Session JWT

第二层回答“这个主体最近是否完成认证”。

这一层的 session token 格式采用 JWT。一个有效的 CBIO session token 必须是一个已签名 JWT，且至少包含以下 claims：

- `iss`：字符串，issuer 标识
- `sub`：字符串，即已认证主体的 `subject_ref` 或主体公钥
- `aud`：字符串或字符串数组，目标受众
- `iat`：数字，签发时间（Unix 秒）
- `exp`：数字，过期时间（Unix 秒）
- `jti`：字符串，唯一 token 标识

可选 claims：

- `sid`：字符串，issuer 定义的 session 标识
- `amr`：字符串数组，认证方法
- `cbio_species`：字符串
- `cbio_kind`：字符串
- `cbio`：对象，用于 issuer 定义的 CBIO 扩展字段

规范性说明：

- 一个有效 session JWT 的含义是：issuer 断言该主体在此 token 生命周期内足够“近期”地完成了认证。
- 当 issuer 希望提供一个自描述主体字符串时，`sub` 应优先使用 `subject_ref`。若双方已约定字段语义，也可以直接使用原始 `public_key`。
- session 是否接受、如何续期、如何撤销、如何存储，以及如何转换成 cookie 或框架 session，均属于本地问题。
- 除上述注册 JWT claims 之外，其他 claim 名在本规范后续标准化之前都属于应用 profile 选择。

### Issuer Keys

session JWT 的验证依赖 issuer 密钥分发。

最小约定：

- `iss` 用来标识 JWT issuer
- 如果 JWT header 中带有 `kid`，验证方应当优先用它选择匹配的验证公钥
- issuer 应当公开其当前有效验证公钥的 JWKS
- 验证方可以通过静态配置取得 issuer 公钥，也可以拉取 issuer 的 JWKS
- 若验证方不是通过 JWKS，而是直接配置 issuer 公钥，则该公钥应使用对应运行时可接受的格式，例如 RSA 的 PEM/SPKI 文本，或 Ed25519 的 base64url SPKI DER

本规范不强制规定 discovery 协议；它只要求验证方与 issuer 对 `iss` 以及可选的 `kid` 到验证公钥之间的映射保持一致。

## 第三层：单次请求 Proof

### 对象：`RequestProof`

必填字段：

- `cbio_protocol`：字符串，固定值 `v1.0`
- `kind`：字符串，固定值 `request_proof`
- `subject`：对象
- `subject.public_key`：字符串
- `request`：对象
- `request.action`：字符串
- `request.issued_at`：字符串
- `request.nonce`：字符串
- `signature`：字符串

可选字段：

- `subject.subject_ref`：字符串
- `request.resource`：字符串
- `request.session_id`：字符串
- `request.audience`：字符串
- `request.metadata`：对象，键和值均为字符串

`RequestProof` 回答“这条精确请求是不是由该主体签署”。

规范性说明：

- `action`、`resource`、`audience` 与 `metadata` 对协议而言都是透明字段。
- 若存在 `subject.subject_ref`，它必须能解码出与 `subject.public_key` 完全一致的公钥。
- 接收方按照自己的本地规则解释这些字段。
- 若存在 `request.session_id`，它表示该请求绑定到某个已发出的 session JWT，但这不会改变本地授权语义。

## 规范序列化

本规范定义的有签名对象对无签名载荷使用确定性序列化。

规则：

1. 序列化前移除签名字段
2. 按规范 schema 顺序序列化字段
3. 省略 `undefined` 字段
4. 严格保持数组顺序
5. 对 metadata 对象按键名字典序排序
6. 以无多余空白的 UTF-8 JSON 编码

规范性约束只在最终输出的字节序列。

## 验证模型

验证方校验密钥与标识符的绑定、session JWT 的完整性，以及请求 proof 的完整性。

对每个内嵌的主体引用：

1. 校验 `public_key` 是否是语法上有效的密钥材料
2. 若存在 `subject_ref`，解析它并比较其中包含的密钥材料与 `public_key`
3. 校验声明的主体密钥材料
4. 若编码无效或字段不合法则拒绝

对 `IdentityDescriptor`：

1. 校验其中的主体引用
2. 若存在 `subject.parent`，校验其中的父主体引用
3. 若存在 `subject.parent`，规范化无签名载荷，并用声明的父公钥验证 `subject.parent_signature`
4. 若不存在 `subject.parent`，则不存在 parent-link 校验步骤

对 session JWT：

1. 使用 issuer 的密钥材料验证 JWT 签名
2. 校验 `iss`、`sub`、`aud`、`iat`、`exp` 与 `jti`
3. 根据 `iat` 与 `exp` 强制检查 token 有效时间区间
4. 若 `sub` 是 `subject_ref`，解析它并恢复出已认证主体公钥
5. 否则将 `sub` 视为已认证主体公钥

对 `RequestProof`：

1. 校验其中的主体引用
2. 规范化无签名载荷
3. 验证主体签名
4. 若接收方需要，再检查 `issued_at`、`nonce` 等新鲜度输入
5. 若存在 `request.session_id`，接收方可以要求存在一个匹配且有效的 session JWT

验证成功只意味着：

- 主体身份内部一致
- 已签名载荷未被篡改
- 相关签名者签署了这份精确载荷
- 若存在 parent 链接，则声明的父主体签署了这份子身份载荷

验证成功不意味着：

- 接收方必须接受该主体
- 接收方必须接受该 session
- 接收方必须接受该请求
- 接收方必须信任声明出来的 parent chain
- 该主体在接收方策略下拥有任何动作权限

## 工件与生命周期预期

传输封装宜标明协议版本、对象种类、主体标识、已签名载荷、签名与相关时间戳。

重放窗口、nonce 保留、session 存储、JWT 签发、限流、配额与放行策略不属于本规范。

## 稳定性与一致性

独立实现对相同输入必须得到相同验证结果。因此：

- 对象形态与签名输入必须保持显式且带版本
- `species`、`kind_label`、动作名、audience 值与 metadata 对协议而言都只是透明字节
- 一致性测试与测试向量属于协议表面

若某行为未精确到可跨实现复现，则尚不构成稳定协议事实。
