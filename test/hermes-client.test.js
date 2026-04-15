import test from "node:test";
import assert from "node:assert/strict";
import { extractResponseText } from "../src/hermes-client.js";

test("extractResponseText prefers output_text when present", () => {
  const payload = {
    output_text: "ok",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "ignored" }],
      },
    ],
  };

  assert.equal(extractResponseText(payload), "ok");
});

test("extractResponseText collects output message text", () => {
  const payload = {
    output: [
      { type: "reasoning", summary: [] },
      {
        type: "message",
        role: "assistant",
        content: [
          { type: "output_text", text: "hello" },
          { type: "output_text", text: "world" },
        ],
      },
    ],
  };

  assert.equal(extractResponseText(payload), "hello\nworld");
});
