import http from "node:http";
import { loadConfig } from "./config.js";
import { HermesClient } from "./hermes-client.js";
import {
  cleanOutboundText,
  containsKeyword,
  extractPlainText,
  getReplyMessageId,
  hasAtSelf,
  isCommand,
  parseCommand,
  sleep,
  splitMessage,
} from "./message-utils.js";
import { OneBotClient } from "./onebot-client.js";
import { StateStore } from "./state-store.js";

const config = loadConfig();
const stateStore = new StateStore(config.dataDir);
await stateStore.init();

const hermesClient = new HermesClient(config);
const onebot = new OneBotClient({
  wsUrl: config.onebotWsUrl,
  accessToken: config.onebotAccessToken,
});

const sessionChains = new Map();
const notificationCooldown = new Map();

function log(message, ...args) {
  console.log(`[hermes_qq] ${message}`, ...args);
}

function buildBaseSessionKey(route) {
  if (route.type === "group") {
    if (config.groupSessionsPerUser) {
      return `qq:group:${route.groupId}:user:${route.userId}`;
    }
    return `qq:group:${route.groupId}`;
  }
  return `qq:user:${route.userId}`;
}

function enqueueSession(baseKey, task, delayMs = 0) {
  const previous = sessionChains.get(baseKey) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      if (delayMs > 0) {
        await sleep(delayMs);
      }
      return task();
    })
    .finally(() => {
      if (sessionChains.get(baseKey) === next) {
        sessionChains.delete(baseKey);
      }
    });
  sessionChains.set(baseKey, next);
  return next;
}

function isAdmin(userId) {
  return config.admins.has(String(userId));
}

function canUserChat(route) {
  const userId = String(route.userId);
  const groupId = String(route.groupId || "");

  if (config.blockedUsers.has(userId)) {
    return false;
  }
  if (config.allowedUsers.size > 0 && !config.allowedUsers.has(userId) && !isAdmin(userId)) {
    return false;
  }
  if (route.type === "group" && config.allowedGroups.size > 0 && !config.allowedGroups.has(groupId)) {
    return false;
  }
  return true;
}

async function isReplyToBot(event) {
  const replyMessageId = getReplyMessageId(event.message);
  if (!replyMessageId) {
    return false;
  }
  try {
    const reply = await onebot.getMsg(replyMessageId);
    const senderId = reply?.sender?.user_id ?? reply?.user_id;
    if (!senderId) {
      return false;
    }
    return String(senderId) === String(onebot.selfId || config.botQq || "");
  } catch (error) {
    log(`reply lookup failed: ${String(error)}`);
    return false;
  }
}

function buildContextLabel(route) {
  if (route.type === "group") {
    return `当前来自 QQ 群 ${route.groupId}。发送者: ${route.senderName || route.userId} (${route.userId})。请按 QQ 聊天风格回复。`;
  }
  return `当前来自 QQ 私聊用户 ${route.senderName || route.userId} (${route.userId})。请按 QQ 聊天风格回复。`;
}

function shouldNotifyBlocked(userId) {
  const now = Date.now();
  const key = String(userId);
  const lastTime = notificationCooldown.get(key) || 0;
  if (now - lastTime < 10000) {
    return false;
  }
  notificationCooldown.set(key, now);
  return true;
}

async function sendText(route, text) {
  const chunks = splitMessage(text, config.maxMessageLength);
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    if (route.type === "group") {
      const message = [];
      if (index === 0 && route.replyToId) {
        message.push({ type: "reply", data: { id: String(route.replyToId) } });
      }
      if (index === 0 && config.mentionSenderInGroup) {
        message.push({ type: "at", data: { qq: String(route.userId) } });
        message.push({ type: "text", data: { text: ` ${chunk}` } });
      } else {
        message.push({ type: "text", data: { text: chunk } });
      }
      await onebot.sendGroupMsg(route.groupId, message);
    } else {
      await onebot.sendPrivateMsg(route.userId, chunk);
    }
    if (index < chunks.length - 1 && config.rateLimitMs > 0) {
      await sleep(config.rateLimitMs);
    }
  }
}

async function sendCommandReply(route, text) {
  const cleaned = cleanOutboundText(text, true) || "命令已处理。";
  await sendText(route, cleaned);
}

async function handleCommand(route, text) {
  const command = parseCommand(text);
  if (!command) {
    return false;
  }

  const baseKey = buildBaseSessionKey(route);
  if (command.name === "ping") {
    await sendCommandReply(route, "pong");
    return true;
  }
  if (command.name === "help") {
    await sendCommandReply(
      route,
      [
        "可用命令:",
        "/ping - 连通性检查",
        "/model - 查看当前 Hermes 模型",
        "/new - 新建会话",
        "/reset - 新建会话",
      ].join("\n"),
    );
    return true;
  }
  if (command.name === "model") {
    await sendCommandReply(route, `当前模型: ${config.hermesModel}`);
    return true;
  }
  if (command.name === "new" || command.name === "reset") {
    await stateStore.bumpSession(baseKey);
    await sendCommandReply(route, "已创建新会话。");
    return true;
  }
  return false;
}

async function handleInboundMessage(event) {
  const messageType = String(event?.message_type || "");
  if (!["private", "group"].includes(messageType)) {
    return;
  }

  const userId = String(event?.user_id || "");
  const groupId = String(event?.group_id || "");
  const selfId = String(onebot.selfId || config.botQq || "");

  if (!userId || (selfId && userId === selfId)) {
    return;
  }

  const route = {
    type: messageType,
    userId,
    groupId,
    replyToId: String(event?.message_id || ""),
    senderName: String(event?.sender?.card || event?.sender?.nickname || userId),
  };

  if (!canUserChat(route)) {
    return;
  }

  if (config.adminOnlyChat && !isAdmin(userId)) {
    if (config.notifyNonAdminBlocked && shouldNotifyBlocked(userId)) {
      await sendText(route, config.nonAdminBlockedMessage);
    }
    return;
  }

  const incomingText = extractPlainText(event.message, {
    selfId,
    stripSelfMentions: true,
  });
  const normalizedText = incomingText.trim();
  if (!normalizedText) {
    return;
  }

  const keywordHit = containsKeyword(normalizedText, config.keywordTriggers);
  const commandMessage = isCommand(normalizedText);

  if (route.type === "group") {
    const mentioned = hasAtSelf(event.message, selfId || config.botQq);
    const repliedToBot = await isReplyToBot(event);
    let triggered = false;

    if (config.keywordOnlyTrigger) {
      triggered = Boolean(keywordHit) || (config.allowBareGroupCommands && commandMessage);
    } else if (config.requireMention) {
      triggered = mentioned || repliedToBot || Boolean(keywordHit) || (config.allowBareGroupCommands && commandMessage);
    } else {
      triggered = true;
    }

    if (!triggered) {
      return;
    }
  }

  if (await handleCommand(route, normalizedText)) {
    return;
  }

  const baseKey = buildBaseSessionKey(route);
  const sessionId = stateStore.getSessionId(baseKey);
  const contextLabel = buildContextLabel(route);

  await enqueueSession(
    baseKey,
    async () => {
      try {
        const reply = await hermesClient.complete({
          sessionId,
          message: normalizedText,
          contextLabel,
        });

        const cleaned = cleanOutboundText(reply, config.formatMarkdown);
        const outbound = cleaned || "这轮 Hermes 没有返回可发送的文本。";
        await sendText(route, outbound);
      } catch (error) {
        log(`message handling failed for ${sessionId}: ${String(error)}`);
        await sendText(route, `调用 Hermes 失败: ${String(error.message || error)}`);
      }
    },
    config.queueDebounceMs,
  );
}

function startHealthServer() {
  const server = http.createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ status: "ok", service: "hermes_qq" }));
      return;
    }
    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(config.port, config.healthHost, () => {
    log(`health server listening on http://${config.healthHost}:${config.port}/health`);
  });

  return server;
}

onebot.on("connect", async () => {
  log(`connected to OneBot: ${config.onebotWsUrl}`);
  try {
    const loginInfo = await onebot.getLoginInfo();
    if (loginInfo?.user_id) {
      log(`OneBot self id: ${loginInfo.user_id}`);
    }
  } catch (error) {
    log(`failed to fetch login info: ${String(error)}`);
  }
});

onebot.on("disconnect", () => {
  log("disconnected from OneBot");
});

onebot.on("warn", (message) => {
  log(message);
});

onebot.on("message", (payload) => {
  handleInboundMessage(payload).catch((error) => {
    log(`unhandled inbound error: ${String(error)}`);
  });
});

const server = startHealthServer();
onebot.connect();

function shutdown() {
  log("shutting down");
  server.close();
  onebot.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
