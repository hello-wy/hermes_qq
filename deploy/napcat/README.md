# NapCat 部署对接

`hermes_qq` 默认假设：

- NapCat 提供 OneBot v11 正向 WebSocket
- Hermes API Server 与 `hermes_qq` 在同一台机器上

## NapCat 必要配置

OneBot11 WebSocket Server:

- `host = 0.0.0.0`
- `port = 3001`
- `message_post_format = array`
- `token = <与你的 hermes_qq .env 一致>`

## hermes_qq 对应配置

```dotenv
ONEBOT_WS_URL=ws://127.0.0.1:3001
ONEBOT_ACCESS_TOKEN=your-onebot-token
HERMES_BASE_URL=http://127.0.0.1:8642/v1
HERMES_API_KEY=your-hermes-api-key
```

## 容器部署

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

当前示例 compose 使用 `host network`，这样最省事：

- `hermes_qq` 可直接连本机 Hermes API
- `hermes_qq` 可直接连本机 NapCat WS 端口

## 验证顺序

1. NapCat 登录成功
2. OneBot WebSocket 已启用
3. `curl http://127.0.0.1:8303/health`
4. 群里 `@机器人 /ping`
