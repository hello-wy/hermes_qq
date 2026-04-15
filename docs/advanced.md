# 高级说明

## 整体架构

```text
QQ -> NapCat -> OneBot WS -> hermes_qq -> Hermes /v1/chat/completions
```

`hermes_qq` 不直接嵌进 Hermes，也不复用 OpenClaw 插件运行时。它是一个独立 Node 服务，目标是把 QQ 渠道适配层和 Hermes Agent 本身解耦。

## 为什么不用直接改 Hermes

- Hermes upstream 目前没有 OneBot / NapCat 官方入口
- 独立桥接服务更容易单独部署和回滚
- 以后即使换掉 Hermes 后端，这层 QQ 逻辑也可以保留

## 会话策略

默认行为：

- 私聊：每个用户一个 Hermes session
- 群聊：整个群共享一个 Hermes session

如果你开启 `GROUP_SESSIONS_PER_USER=true`，则群里会按发言用户拆分 Hermes session，避免不同人互相污染上下文。

## Markdown 清洗策略

发送到 QQ 前会做这些处理：

- 去掉 `<think>...</think>`
- 去掉 fenced code block 标记
- 把粗体、斜体、标题、引用尽量拍平成纯文本
- 超长内容自动分段

这不是“完整 Markdown 渲染”，目标只是减少 QQ 里看起来乱掉的痕迹。

## 命令

- `/ping`
- `/help`
- `/model`
- `/new`
- `/reset`

这些命令本身不走 Hermes 推理，直接由桥接层处理。

## 当前已知限制

- 还没做 OpenClaw QQ 那种临时会话槽
- 还没做长回复自动合并转发
- 还没做 reply / forward 深层上下文递归展开
- 还没做图片下载缓存与多模态注入
- 目前只覆盖私聊与群聊，不含 QQ 频道

## 后续可补方向

- 临时会话槽
- reply / forward 上下文增强
- 图片缓存与多模态
- 长回复合并转发
- 更细的风控与速率治理
