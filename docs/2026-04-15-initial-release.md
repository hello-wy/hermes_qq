# 2026-04-15 初始版本说明

这是 `hermes_qq` 的首个可用版本。

## 本次完成

- 打通 Hermes Agent 与 NapCat / OneBot v11
- 增加 Hermes OpenAI 兼容 API 调用
- 增加基于 `X-Hermes-Session-Id` 的会话连续性
- 增加基础权限控制：
  - 管理员
  - 群白名单
  - 用户白名单
  - 用户黑名单
- 增加群聊触发策略：
  - `@` 触发
  - 回复触发
  - 关键词触发
  - 可选裸命令触发
- 增加 QQ 输出清洗：
  - 去 Markdown 痕迹
  - 自动分段
- 增加基础命令：
  - `/ping`
  - `/help`
  - `/model`
  - `/new`
  - `/reset`

## 当前状态

这个版本已经适合：

- 小范围群聊测试
- 自己托管的 Hermes + NapCat 接入
- 替换原本接 AstrBot 的轻量桥接场景

## 当前还不是目标的部分

- 还不是 OpenClaw QQ 的完全等价替代
- 还没有做所有高级交互增强
- 当前优先级仍是“先稳定接通与好维护”
