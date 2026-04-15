# 配置参考（分组版）

> 目标：先看必须配什么，再看哪些是按需打开的控制项。

## A. 必需项

- `ONEBOT_WS_URL`
  - NapCat 正向 WebSocket 地址
- `HERMES_BASE_URL`
  - Hermes API 地址，必须带 `/v1`
- `HERMES_API_KEY`
  - Hermes API Bearer Token

## B. Hermes 侧

- `HERMES_MODEL`
  - 对外调用的模型名，默认 `hermes-agent`
- `SYSTEM_PROMPT`
  - 追加系统提示词
- `REQUEST_TIMEOUT_MS`
  - Hermes 请求超时
- `MAX_RETRIES`
  - 请求失败自动重试次数
- `RETRY_DELAY_MS`
  - 重试等待

## C. 访问控制

- `ADMINS`
  - 管理员 QQ 列表
- `ALLOWED_GROUPS`
  - 群白名单
- `ALLOWED_USERS`
  - 用户白名单
- `BLOCKED_USERS`
  - 用户黑名单
- `ADMIN_ONLY_CHAT`
  - 是否仅管理员可触发聊天
- `NOTIFY_NON_ADMIN_BLOCKED`
  - 非管理员被拦截时是否回提示
- `NON_ADMIN_BLOCKED_MESSAGE`
  - 被拦截提示文案

## D. 群聊触发

- `REQUIRE_MENTION`
  - 群里是否要求 `@` / 回复 / 关键词才触发
- `KEYWORD_ONLY_TRIGGER`
  - 群里是否只允许关键词触发
- `KEYWORD_TRIGGERS`
  - 唤醒词列表
- `ALLOW_BARE_GROUP_COMMANDS`
  - 群里是否允许直接发 `/model` 这类指令

## E. 输出行为

- `FORMAT_MARKDOWN`
  - 是否把 Markdown 尽量转成纯文本
- `MAX_MESSAGE_LENGTH`
  - 单条最大发送长度
- `RATE_LIMIT_MS`
  - 分段发送间隔
- `MENTION_SENDER_IN_GROUP`
  - 群里回消息时是否自动 `@` 原发送者

## F. 会话行为

- `GROUP_SESSIONS_PER_USER`
  - 群里是共享会话还是按用户拆会话
- `QUEUE_DEBOUNCE_MS`
  - 同一会话的防抖窗口
- `DATA_DIR`
  - 本地 session version 状态目录

## 推荐最小生产配置

```dotenv
ONEBOT_WS_URL=ws://127.0.0.1:3001
ONEBOT_ACCESS_TOKEN=your-onebot-token
HERMES_BASE_URL=http://127.0.0.1:8642/v1
HERMES_API_KEY=your-hermes-key
HERMES_MODEL=hermes-agent
REQUIRE_MENTION=true
KEYWORD_TRIGGERS=hermes,小h
FORMAT_MARKDOWN=true
MAX_MESSAGE_LENGTH=1200
RATE_LIMIT_MS=800
```

## 权限收紧示例

```dotenv
ADMINS=123456789
ALLOWED_GROUPS=987654321
ALLOWED_USERS=123456789 2233445566
BLOCKED_USERS=44556677
ADMIN_ONLY_CHAT=true
NOTIFY_NON_ADMIN_BLOCKED=true
```

## 触发策略示例

如果你想“群里必须带唤醒词，不想普通消息误触发”，推荐：

```dotenv
REQUIRE_MENTION=true
KEYWORD_TRIGGERS=hermes,小h
ALLOW_BARE_GROUP_COMMANDS=false
```

如果你想“只认关键词，`@` 也不触发”，推荐：

```dotenv
KEYWORD_ONLY_TRIGGER=true
KEYWORD_TRIGGERS=hermes
```
