import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("页面提供完整编辑控件", async () => {
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );

  for (const id of [
    "render-canvas",
    "gap",
    "scale",
    "offset-x",
    "offset-y",
    "swap-button",
    "reset-button",
    "export-button",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  assert.match(
    html,
    /<canvas[\s\S]*?width="648"[\s\S]*?height="648"[\s\S]*?<\/canvas>/,
  );
});
