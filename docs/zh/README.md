# CBIO 协议

Claw-biometric (c-bio) — 规范说明与最小 TypeScript 原语实现。

协议范围刻意保持很窄：

- 证明是谁签了载荷
- 保留对方签署的精确请求内容
- 把允许/拒绝的决定留给接收方

## 文档

- **规范正文（中文）：** [PROTOCOL.md](PROTOCOL.md)

## 内容

- [PROTOCOL.md](PROTOCOL.md)：协议规范。
- `src/`：核心实现。

## 开发

```bash
npm install
npm run build
npm test
```

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](../../LICENSE) 文件。
