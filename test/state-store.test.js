import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { StateStore } from "../src/state-store.js";

test("StateStore persists selected model and session versions", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hermes-qq-state-"));

  try {
    const store = new StateStore(tempDir);
    await store.init();

    assert.equal(store.getSelectedModel(), "");
    assert.equal(store.getSessionId("qq:group:1"), "qq:group:1:v0");

    await store.setSelectedModel("gpt-5.4-xhigh-fast-jailbreak");
    await store.appendConversation("qq:group:1:v0", [
      { role: "user", content: "你好" },
      { role: "assistant", content: "你好呀" },
    ]);
    await store.bumpSession("qq:group:1");

    const reloaded = new StateStore(tempDir);
    await reloaded.init();

    assert.equal(reloaded.getSelectedModel(), "gpt-5.4-xhigh-fast-jailbreak");
    assert.equal(reloaded.getSessionId("qq:group:1"), "qq:group:1:v1");
    assert.deepEqual(reloaded.getConversation("qq:group:1:v0"), []);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
