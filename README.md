<h1 align="center">Hermes QQ（OneBot v11）</h1>

<p align="center">把 Hermes Agent 接到 QQ / NapCat 的独立桥接服务，目标是先稳定跑通，再逐步补齐生产能力。</p>

<p align="center">
  [<a href="./docs/index.md">文档中心</a>] [<a href="./docs/quickstart.md">3 分钟快速开始</a>] [<a href="./docs/config-reference.md">配置参考</a>] [<a href="./deploy/napcat/README.md">NapCat 部署</a>] [<a href="./docs/advanced.md">高级说明</a>]
</p>

> [!IMPORTANT]
> 正式交流与问题反馈统一走论坛讨论区，避免 QQ 群消息淹没配置经验与排障结论。

## 项目定位

Hermes 本身没有 OneBot / NapCat 适配层，`hermes_qq` 的职责是：

- 接 OneBot v11 WebSocket。
- 把 QQ 消息转成 Hermes OpenAI 兼容 API 请求。
- 管理 QQ 会话与 Hermes session continuity。
- 对输出做 QQ 友好的纯文本清洗，减少 Markdown 痕迹。
- 提供基础的白名单、触发条件和权限控制。

如果你要的是“比传统 QQ 聊天机器人更像 agent”的效果，这个项目就是这一层桥。

## 当前能力

- OneBot v11 WebSocket 接入
- NapCat 兼容
- Hermes `/v1/chat/completions` 调用
- `X-Hermes-Session-Id` 会话连续性
- 群聊 `@` / 回复 / 关键词触发
- 群白名单、用户白名单、管理员限制、用户黑名单
- Markdown 清洗与长消息分段
- 基础命令：
  - `/ping`
  - `/help`
  - `/model`
  - `/new`
  - `/reset`

## 当前不做的事

- 不直接改 Hermes core。
- 不直接依赖 OpenClaw 插件系统。
- 不提供 QQ 登录能力；登录仍由 NapCat 负责。

## 推荐阅读顺序

1. [3 分钟快速开始](./docs/quickstart.md)
2. [配置参考](./docs/config-reference.md)
3. [2026-04-15 初始版本说明](./docs/2026-04-15-initial-release.md)
4. [高级说明](./docs/advanced.md)
5. [NapCat 部署](./deploy/napcat/README.md)

## 目录结构

- `src/`
  - 核心桥接逻辑
- `docs/`
  - Markdown 文档
- `deploy/`
  - 部署文件
- `test/`
  - 基础单测

## 快速开始

```bash
cp .env.example .env
npm install
npm start
```

健康检查：

```bash
curl http://127.0.0.1:8303/health
```

## 典型部署链路

```text
QQ -> NapCat -> OneBot WebSocket -> hermes_qq -> Hermes API Server -> LLM / tools
```

## 适合什么场景

- 已经有 Hermes Agent，想接入 QQ 群和私聊
- 想保留 NapCat 登录与 OneBot 生态
- 想让 QQ 侧体验尽量接近“agent 助手”而不是简单问答 bot

## License

MIT
