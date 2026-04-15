import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_STATE = {
  sessionVersions: {},
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

  async bumpSession(baseKey) {
    const nextVersion = this.getSessionVersion(baseKey) + 1;
    this.state.sessionVersions[baseKey] = nextVersion;
    await this.persist();
    return `${baseKey}:v${nextVersion}`;
  }

  async persist() {
    const payload = JSON.stringify(this.state, null, 2);
    await fs.writeFile(this.stateFile, payload, "utf8");
  }
}
