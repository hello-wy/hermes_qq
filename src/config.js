import fs from "node:fs";
import path from "node:path";

function loadDotEnv(dotEnvPath) {
  if (!fs.existsSync(dotEnvPath)) {
    return;
  }
  const raw = fs.readFileSync(dotEnvPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getString(name, defaultValue = "") {
  const value = process.env[name];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return String(value).trim();
}

function getBoolean(name, defaultValue = false) {
  const value = getString(name, "");
  if (!value) {
    return defaultValue;
  }
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

function getInteger(name, defaultValue) {
  const value = getString(name, "");
  if (!value) {
    return defaultValue;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseList(value) {
  if (!value) {
    return [];
  }
  return Array.from(
    new Set(
      String(value)
        .split(/[\s,]+/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function parseLowercaseList(value) {
  return parseList(value).map((item) => item.toLowerCase());
}

export function loadConfig() {
  loadDotEnv(path.resolve(process.cwd(), ".env"));

  const dataDir = path.resolve(getString("DATA_DIR", "./data"));
  const botQq = getString("BOT_QQ", "");
  const botName = getString("BOT_NAME", "Hermes");
  const botIdentity = botName || "Hermes";
  const baseSystemPrompt = [
    `You are ${botIdentity} speaking inside QQ via OneBot.`,
    "Keep replies concise, useful, and plain-text by default.",
    "Avoid Markdown headings, tables, and fenced code blocks unless the user explicitly asks for them.",
    "When the user asks for code, you may send code, but prefer short snippets and explanations that render well in QQ.",
  ].join("\n");

  const extraSystemPrompt = getString("SYSTEM_PROMPT", "");

  return {
    port: getInteger("PORT", 8303),
    healthHost: getString("HEALTH_HOST", "0.0.0.0"),
    dataDir,
    botName,
    botQq,
    onebotWsUrl: requireEnv("ONEBOT_WS_URL"),
    onebotAccessToken: getString("ONEBOT_ACCESS_TOKEN", ""),
    hermesBaseUrl: requireEnv("HERMES_BASE_URL").replace(/\/+$/, ""),
    hermesApiKey: requireEnv("HERMES_API_KEY"),
    hermesModel: getString("HERMES_MODEL", "hermes-agent"),
    systemPrompt: extraSystemPrompt ? `${baseSystemPrompt}\n${extraSystemPrompt}` : baseSystemPrompt,
    admins: new Set(parseList(getString("ADMINS", ""))),
    allowedGroups: new Set(parseList(getString("ALLOWED_GROUPS", ""))),
    allowedUsers: new Set(parseList(getString("ALLOWED_USERS", ""))),
    blockedUsers: new Set(parseList(getString("BLOCKED_USERS", ""))),
    requireMention: getBoolean("REQUIRE_MENTION", true),
    adminOnlyChat: getBoolean("ADMIN_ONLY_CHAT", false),
    notifyNonAdminBlocked: getBoolean("NOTIFY_NON_ADMIN_BLOCKED", false),
    nonAdminBlockedMessage: getString("NON_ADMIN_BLOCKED_MESSAGE", "当前仅白名单或管理员可触发机器人。"),
    keywordOnlyTrigger: getBoolean("KEYWORD_ONLY_TRIGGER", false),
    keywordTriggers: parseLowercaseList(getString("KEYWORD_TRIGGERS", "")),
    allowBareGroupCommands: getBoolean("ALLOW_BARE_GROUP_COMMANDS", false),
    formatMarkdown: getBoolean("FORMAT_MARKDOWN", true),
    mentionSenderInGroup: getBoolean("MENTION_SENDER_IN_GROUP", false),
    maxMessageLength: Math.max(200, getInteger("MAX_MESSAGE_LENGTH", 1200)),
    rateLimitMs: Math.max(0, getInteger("RATE_LIMIT_MS", 800)),
    requestTimeoutMs: Math.max(10000, getInteger("REQUEST_TIMEOUT_MS", 180000)),
    maxRetries: Math.max(0, getInteger("MAX_RETRIES", 1)),
    retryDelayMs: Math.max(0, getInteger("RETRY_DELAY_MS", 2000)),
    groupSessionsPerUser: getBoolean("GROUP_SESSIONS_PER_USER", false),
    localHistoryEnabled: getBoolean("LOCAL_HISTORY_ENABLED", false),
    localHistoryMaxMessages: Math.max(2, getInteger("LOCAL_HISTORY_MAX_MESSAGES", 24)),
    queueDebounceMs: Math.max(0, getInteger("QUEUE_DEBOUNCE_MS", 0)),
  };
}
