import { sleep } from "./message-utils.js";

export class HermesClient {
  constructor(config) {
    this.config = config;
  }

  async complete({ sessionId, message, contextLabel }) {
    const body = {
      model: this.config.hermesModel,
      stream: false,
      messages: [
        {
          role: "system",
          content: this.config.systemPrompt,
        },
        {
          role: "user",
          content: this.buildUserPrompt(message, contextLabel),
        },
      ],
    };

    let lastError = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      try {
        const response = await fetch(`${this.config.hermesBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.config.hermesApiKey}`,
            "Content-Type": "application/json",
            "X-Hermes-Session-Id": sessionId,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const messageText =
            payload?.error?.message ||
            payload?.detail ||
            `Hermes request failed with HTTP ${response.status}`;
          throw new Error(messageText);
        }

        const content = payload?.choices?.[0]?.message?.content;
        if (!content || !String(content).trim()) {
          throw new Error("Hermes returned empty content");
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

    throw lastError || new Error("Hermes request failed");
  }

  buildUserPrompt(message, contextLabel) {
    const prefix = contextLabel ? `${contextLabel}\n\n` : "";
    return `${prefix}${message}`.trim();
  }
}
