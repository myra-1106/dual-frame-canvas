import test from "node:test";
import assert from "node:assert/strict";
import {
  clampImageState,
  getCoverState,
  getSlots,
  zoomAtPoint,
} from "../src/geometry.js";

test("正方形画布让两张竖图以 10px 间距紧凑居中", () => {
  assert.deepEqual(getSlots(10, [
    { width: 1000, height: 2000 },
    { width: 1000, height: 2000 },
  ]), [
    { x: 0, y: 5, width: 319, height: 638 },
    { x: 329, y: 5, width: 319, height: 638 },
  ]);
});

test("宽图随可用宽度缩小并保持完整比例", () => {
  assert.deepEqual(getSlots(10, [
    { width: 2000, height: 1000 },
    { width: 2000, height: 1000 },
  ]), [
    { x: 0, y: 244.25, width: 319, height: 159.5 },
    { x: 329, y: 244.25, width: 319, height: 159.5 },
  ]);
});

test("间距被约束在 0 到 40", () => {
  const sizes = [
    { width: 2000, height: 1000 },
    { width: 2000, height: 1000 },
  ];
  assert.equal(getSlots(-1, sizes)[0].width, 324);
  assert.equal(getSlots(50, sizes)[0].width, 304);
});

test("竖图初始状态覆盖区域并居中", () => {
  assert.deepEqual(
    getCoverState(1000, 2000, { x: 0, y: 0, width: 500, height: 600 }),
    { scale: 0.5, x: 0, y: -200 },
  );
});

test("拖动不会在区域内留下空白", () => {
  assert.deepEqual(
    clampImageState(
      { scale: 1, x: 100, y: -900 },
      800,
      1000,
      { x: 0, y: 0, width: 500, height: 600 },
    ),
    { scale: 1, x: 0, y: -400 },
  );
});

test("缩放保持指针下方的图片位置", () => {
  assert.deepEqual(
    zoomAtPoint(
      { scale: 1, x: 0, y: 0 },
      2,
      { x: 250, y: 300 },
      { width: 500, height: 600 },
      { x: 0, y: 0, width: 500, height: 600 },
    ),
    { scale: 2, x: -250, y: -300 },
  );
});
