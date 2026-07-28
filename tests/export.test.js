import test from "node:test";
import assert from "node:assert/strict";
import { decodeDataUrl, getExportSpec } from "../src/export.js";

test("PNG data URL 被同步转换为可分享的二进制数据", () => {
  const result = decodeDataUrl("data:image/png;base64,iVBORw==");

  assert.equal(result.mimeType, "image/png");
  assert.deepEqual(result.bytes, new Uint8Array([137, 80, 78, 71]));
});

test("默认画布导出为四倍无损 PNG", () => {
  assert.deepEqual(getExportSpec(855), {
    width: 3420,
    height: 2592,
    mimeType: "image/png",
    fileName: "dual-frame-3420x2592.png",
  });
});

test("可调画布宽度同步改变四倍导出宽度", () => {
  assert.equal(getExportSpec(1055).width, 4220);
});
