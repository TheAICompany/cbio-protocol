# CBIO 协议

Claw-biometric (c-bio) 是一种受治理的代理身份协议。

本仓库包含身份推导、治理对象和验证逻辑的规范与核心 Node.js (TypeScript) 实现。

## 目的

本协议以身份为首要原则：
- 每个代理都是一等公民身份。
- 治理关系（颁发、委派、撤销）对协议可见。
- 系统旨在为自主代理提供安全、可验证的身份。

## 内容

- [PROTOCOL.md](PROTOCOL.md): 完整协议规范。
- [CAPABILITIES.md](CAPABILITIES.md): 能力与权限矩阵。
- `src/`: 核心实现。

## 开发

```bash
npm install
npm run build
npm test
```

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](../../LICENSE) 文件。
