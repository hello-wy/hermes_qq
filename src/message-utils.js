export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isCommand(text) {
  return /^\/[^\s/]+/u.test(String(text || "").trim());
}

export function parseCommand(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }
  const parts = trimmed.split(/\s+/);
  const name = parts[0].slice(1).toLowerCase();
  const args = parts.slice(1);
  return { name, args, raw: trimmed };
}

export function hasAtSelf(message, selfId) {
  if (!Array.isArray(message) || !selfId) {
    return false;
  }
  return message.some((segment) => segment?.type === "at" && String(segment?.data?.qq || "") === String(selfId));
}

export function getReplyMessageId(message) {
  if (!Array.isArray(message)) {
    return "";
  }
  const segment = message.find((item) => item?.type === "reply" && item?.data?.id);
  return segment ? String(segment.data.id) : "";
}

export function extractPlainText(message, options = {}) {
  const { selfId = "", stripSelfMentions = false } = options;
  if (typeof message === "string") {
    return message.trim();
  }
  if (!Array.isArray(message)) {
    return "";
  }

  const chunks = [];
  for (const segment of message) {
    const type = String(segment?.type || "");
    const data = segment?.data || {};
    if (type === "text") {
      chunks.push(String(data.text || ""));
      continue;
    }
    if (type === "at") {
      const qq = String(data.qq || "");
      if (stripSelfMentions && selfId && qq === String(selfId)) {
        continue;
      }
      chunks.push(`@${qq}`);
      continue;
    }
    if (type === "image") {
      chunks.push("[图片]");
      continue;
    }
    if (type === "record") {
      chunks.push("[语音]");
      continue;
    }
    if (type === "video") {
      chunks.push("[视频]");
      continue;
    }
    if (type === "file") {
      chunks.push("[文件]");
      continue;
    }
    if (type === "reply") {
      chunks.push("[引用消息]");
      continue;
    }
    if (type === "forward") {
      chunks.push("[合并转发]");
      continue;
    }
    if (type === "json") {
      chunks.push("[卡片消息]");
      continue;
    }
  }

  return chunks.join("").replace(/\s+\n/g, "\n").trim();
}

export function containsKeyword(text, keywords) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
  for (const keyword of keywords || []) {
    const normalizedKeyword = String(keyword || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .trim();
    if (normalizedKeyword && normalized.includes(normalizedKeyword)) {
      return keyword;
    }
  }
  return "";
}

export function cleanOutboundText(text, formatMarkdown = true) {
  let cleaned = String(text || "");

  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/^\s*assistant\s*:\s*/i, "");
  cleaned = cleaned.replace(/\r\n/g, "\n");
  cleaned = cleaned.replace(/```([a-z0-9_-]+)?\n?/gi, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "图片: $2");
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/<\/?(div|span|p|strong|em|b|i|code|pre)[^>]*>/gi, "");

  if (formatMarkdown) {
    cleaned = cleaned.replace(/^[ \t]*#{1,6}[ \t]*/gm, "");
    cleaned = cleaned.replace(/^[ \t]*>[ \t]?/gm, "");
    cleaned = cleaned.replace(/^[ \t]*[-*+][ \t]+/gm, "- ");
    cleaned = cleaned.replace(/^[ \t]*\d+\.[ \t]+/gm, "- ");
    cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, "$2");
    cleaned = cleaned.replace(/(^|[^\*])\*(?!\s)([^*]+)\*(?!\*)/g, "$1$2");
    cleaned = cleaned.replace(/(^|[^_])_(?!\s)([^_]+)_(?!_)/g, "$1$2");
    cleaned = cleaned.replace(/^\|/gm, "");
    cleaned = cleaned.replace(/\|$/gm, "");
    cleaned = cleaned.replace(/[ \t]*\|[ \t]*/g, " | ");
  }

  cleaned = cleaned.replace(/[ \t]+\n/g, "\n");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

export function splitMessage(text, limit) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return [];
  }
  if (normalized.length <= limit) {
    return [normalized];
  }

  const pieces = [];
  let remaining = normalized;

  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf("\n\n", limit);
    if (cut < Math.floor(limit * 0.5)) {
      cut = remaining.lastIndexOf("\n", limit);
    }
    if (cut < Math.floor(limit * 0.5)) {
      cut = remaining.lastIndexOf(" ", limit);
    }
    if (cut < Math.floor(limit * 0.5)) {
      cut = limit;
    }

    const chunk = remaining.slice(0, cut).trim();
    if (chunk) {
      pieces.push(chunk);
    }
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) {
    pieces.push(remaining);
  }

  return pieces;
}
