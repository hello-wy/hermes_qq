import test from "node:test";
import assert from "node:assert/strict";
import { extractBalance } from "../src/solid-client.js";

const sample = {
  code: 0,
  message: "success",
  data: {
    items: [
      {
        id: 129,
        email: "3116283690@qq.com",
        balance: 42,
        status: "active",
        total_recharged: 100,
      },
    ],
    total: 1,
  },
};

test("extractBalance reads balance from first item", () => {
  const result = extractBalance(sample, "3116283690@qq.com");
  assert.equal(result.balance, 42);
  assert.equal(result.email, "3116283690@qq.com");
  assert.equal(result.totalRecharged, 100);
  assert.equal(result.status, "active");
});

test("extractBalance matches by email when multiple items", () => {
  const payload = {
    code: 0,
    data: {
      items: [
        { email: "other@qq.com", balance: 1 },
        { email: "wanted@qq.com", balance: 7 },
      ],
    },
  };
  assert.equal(extractBalance(payload, "WANTED@qq.com").balance, 7);
});

test("extractBalance returns null when no items", () => {
  assert.equal(extractBalance({ code: 0, data: { items: [] } }, "x@qq.com"), null);
});

test("extractBalance throws on non-zero code", () => {
  assert.throws(() => extractBalance({ code: 1, message: "unauthorized" }, "x@qq.com"), /unauthorized/);
});
