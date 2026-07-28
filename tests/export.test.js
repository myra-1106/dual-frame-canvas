import test from "node:test";
import assert from "node:assert/strict";
import { decodeDataUrl } from "../src/export.js";

test("JPG data URL 被同步转换为可分享的二进制数据", () => {
  const result = decodeDataUrl("data:image/jpeg;base64,/9j/");

  assert.equal(result.mimeType, "image/jpeg");
  assert.deepEqual(result.bytes, new Uint8Array([255, 216, 255]));
});
