import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_STATE = {
  sessionVersions: {},
  selectedModel: "",
  conversations: {},
};

export class StateStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.stateFile = path.join(this.dataDir, "session-state.json");
    this.state = { ...DEFAULT_STATE };
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
    try {
      const raw = await fs.readFile(this.stateFile, "utf8");
      const parsed = JSON.parse(raw);
      this.state = {
        sessionVersions: { ...(parsed.sessionVersions || {}) },
        selectedModel: String(parsed.selectedModel || "").trim(),
        conversations: this.normalizeConversations(parsed.conversations),
      };
    } catch (error) {
      this.state = { ...DEFAULT_STATE };
      await this.persist();
    }
  }

  getSessionVersion(baseKey) {
    return Number(this.state.sessionVersions[baseKey] || 0);
  }

  getSessionId(baseKey) {
    return `${baseKey}:v${this.getSessionVersion(baseKey)}`;
  }

  getSelectedModel() {
    return String(this.state.selectedModel || "").trim();
  }

  async bumpSession(baseKey) {
    const previousSessionId = this.getSessionId(baseKey);
    const nextVersion = this.getSessionVersion(baseKey) + 1;
    this.state.sessionVersions[baseKey] = nextVersion;
    delete this.state.conversations[previousSessionId];
    await this.persist();
    return `${baseKey}:v${nextVersion}`;
  }

  async setSelectedModel(model) {
    this.state.selectedModel = String(model || "").trim();
    await this.persist();
    return this.getSelectedModel();
  }

  async clearSelectedModel() {
    this.state.selectedModel = "";
    await this.persist();
  }

  getConversation(sessionId) {
    const conversation = this.state.conversations[String(sessionId || "")];
    return Array.isArray(conversation) ? conversation.map((item) => ({ ...item })) : [];
  }

  async appendConversation(sessionId, messages, maxMessages = 24) {
    const key = String(sessionId || "").trim();
    if (!key) {
      return [];
    }

    const existing = this.getConversation(key);
    const incoming = Array.isArray(messages)
      ? messages
          .map((item) => ({
            role: String(item?.role || "").trim(),
            content: String(item?.content || "").trim(),
          }))
          .filter((item) => item.role && item.content)
      : [];

    const combined = existing.concat(incoming);
    const bounded =
      maxMessages > 0 && combined.length > maxMessages
        ? combined.slice(combined.length - maxMessages)
        : combined;

    this.state.conversations[key] = bounded;
    await this.persist();
    return this.getConversation(key);
  }

  normalizeConversations(input) {
    const normalized = {};
    if (!input || typeof input !== "object") {
      return normalized;
    }

    for (const [sessionId, messages] of Object.entries(input)) {
      if (!Array.isArray(messages)) {
        continue;
      }

      const cleaned = messages
        .map((item) => ({
          role: String(item?.role || "").trim(),
          content: String(item?.content || "").trim(),
        }))
        .filter((item) => item.role && item.content);

      if (cleaned.length > 0) {
        normalized[sessionId] = cleaned;
      }
    }

    return normalized;
  }

  async persist() {
    const payload = JSON.stringify(this.state, null, 2);
    await fs.writeFile(this.stateFile, payload, "utf8");
  }
}
