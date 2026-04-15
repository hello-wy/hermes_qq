import { sleep } from "./message-utils.js";

export function extractResponseText(payload) {
  const direct = String(payload?.output_text || "").trim();
  if (direct) {
    return direct;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const chunks = [];

  for (const item of output) {
    if (String(item?.type || "") !== "message") {
      continue;
    }

    const contentItems = Array.isArray(item?.content) ? item.content : [];
    for (const contentItem of contentItems) {
      const text = String(contentItem?.text || "").trim();
      if (!text) {
        continue;
      }
      if (String(contentItem?.type || "") === "output_text") {
        chunks.push(text);
        continue;
      }
      chunks.push(text);
    }
  }

  return chunks.join("\n").trim();
}

export class HermesClient {
  constructor(config) {
    this.config = config;
  }

  async complete({ sessionId, userMessage, model, history = [] }) {
    const input = [
      ...history.map((item) => ({
        role: String(item?.role || "").trim() || "user",
        content: String(item?.content || ""),
      })),
      {
        role: "user",
        content: userMessage,
      },
    ];

    const body = {
      model: model || this.config.hermesModel,
      instructions: this.config.systemPrompt,
      input,
    };

    let lastError = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      try {
        const headers = {
          "Authorization": `Bearer ${this.config.hermesApiKey}`,
          "Content-Type": "application/json",
        };
        if (sessionId) {
          headers["X-Hermes-Session-Id"] = sessionId;
        }

        const response = await fetch(`${this.config.hermesBaseUrl}/responses`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const messageText =
            payload?.error?.message ||
            payload?.detail ||
            `model request failed with HTTP ${response.status}`;
          throw new Error(messageText);
        }

        const content = extractResponseText(payload);
        if (!content || !String(content).trim()) {
          throw new Error("model API returned empty content");
        }

        return String(content);
      } catch (error) {
        lastError = error;
        if (attempt >= this.config.maxRetries) {
          break;
        }
        await sleep(this.config.retryDelayMs);
      }
    }

    throw lastError || new Error("model request failed");
  }

  async listModels() {
    const response = await fetch(`${this.config.hermesBaseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.config.hermesApiKey}`,
      },
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messageText =
        payload?.error?.message ||
        payload?.detail ||
        `model list request failed with HTTP ${response.status}`;
      throw new Error(messageText);
    }

    const models = Array.isArray(payload?.data)
      ? payload.data
          .map((item) => String(item?.id || "").trim())
          .filter(Boolean)
      : [];

    return Array.from(new Set(models));
  }

  buildUserPrompt(message, contextLabel) {
    const prefix = contextLabel ? `${contextLabel}\n\n` : "";
    return `${prefix}${message}`.trim();
  }
}
