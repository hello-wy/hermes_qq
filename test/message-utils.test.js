import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanOutboundText,
  containsKeyword,
  decideGroupTrigger,
  extractPlainText,
  splitMessage,
} from "../src/message-utils.js";

test("extractPlainText strips self mention when requested", () => {
  const text = extractPlainText(
    [
      { type: "at", data: { qq: "123456" } },
      { type: "text", data: { text: " 帮我看下" } },
      { type: "image", data: { file: "x" } },
    ],
    { selfId: "123456", stripSelfMentions: true },
  );

  assert.equal(text, "帮我看下[图片]");
});

test("containsKeyword matches lowercase keywords", () => {
  assert.equal(containsKeyword("请让 Hermes 帮忙", ["hermes", "小h"]), "hermes");
});

test("group command requires mention when bare group commands are disabled", () => {
  const blocked = decideGroupTrigger({
    keywordOnlyTrigger: true,
    allowBareGroupCommands: false,
    commandMessage: true,
  });
  assert.equal(blocked.triggered, false);

  const allowed = decideGroupTrigger({
    keywordOnlyTrigger: true,
    allowBareGroupCommands: false,
    commandMessage: true,
    mentioned: true,
  });
  assert.equal(allowed.triggered, true);
  assert.equal(allowed.triggerReason, "mention-command");
});

test("cleanOutboundText removes think blocks and markdown fences", () => {
  const input = "<think>hidden</think>\n## Title\n```js\nconsole.log(1)\n```\n**ok**";
  const output = cleanOutboundText(input, true);
  assert.equal(output, "Title\nconsole.log(1)\nok");
});

test("splitMessage keeps chunks under limit", () => {
  const chunks = splitMessage("a".repeat(50) + "\n\n" + "b".repeat(50), 60);
  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((item) => item.length <= 60));
});
