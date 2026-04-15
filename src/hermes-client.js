import { sleep } from "./message-utils.js";

export class HermesClient {
  constructor(config) {
    this.config = config;
  }

  async complete({ sessionId, userMessage, model, history = [] }) {
    const body = {
      model: model || this.config.hermesModel,
      stream: false,
      messages: [
        {
          role: "system",
          content: this.config.systemPrompt,
        },
        ...history,
        {
          role: "user",
          content: userMessage,
        },
      ],
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

        const response = await fetch(`${this.config.hermesBaseUrl}/chat/completions`, {
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

        const content = payload?.choices?.[0]?.message?.content;
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
