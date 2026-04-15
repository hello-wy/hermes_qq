# 3 分钟快速开始

## 1. 前置条件

- 已经有可用的 Hermes Agent API Server
- 已经有可用的 NapCat / OneBot v11
- OneBot 配置中的 `message_post_format` 必须为 `array`

## 2. 安装

```bash
git clone https://github.com/constansino/hermes_qq.git
cd hermes_qq
npm install
```

## 3. 配置 `.env`

最少需要填这些：

- `ONEBOT_WS_URL`
- `ONEBOT_ACCESS_TOKEN`
- `HERMES_BASE_URL`
- `HERMES_API_KEY`

示例：

```dotenv
ONEBOT_WS_URL=ws://127.0.0.1:3001
ONEBOT_ACCESS_TOKEN=your-onebot-token
HERMES_BASE_URL=http://127.0.0.1:8642/v1
HERMES_API_KEY=your-hermes-api-key
HERMES_MODEL=hermes-agent
```

## 4. 启动

```bash
npm start
```

## 5. 验证

```bash
curl http://127.0.0.1:8303/health
```

预期：

```json
{"status":"ok","service":"hermes_qq"}
```

## 6. 进群测试

- 私聊机器人发 `/ping`
- 群聊里 `@机器人 /ping`
- 群聊里发送唤醒词，例如 `hermes 帮我总结一下`

## 7. 下一步

- 想限制可用群和用户：看 [配置参考](./config-reference.md)
- 想走容器部署：看 [NapCat 部署](../deploy/napcat/README.md)
- 想理解桥接行为：看 [高级说明](./advanced.md)
- 想提问题或交流经验：看 [论坛讨论区](https://aiya.de5.net/c/hermes-qq/29)
