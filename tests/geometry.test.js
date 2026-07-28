import test from "node:test";
import assert from "node:assert/strict";
import {
  clampImageState,
  getCoverState,
  getSlots,
  zoomAtPoint,
} from "../src/geometry.js";

test("画布宽度只改变左右外边距，不改变图片尺寸和相对位置", () => {
  const sizes = [
    { width: 1000, height: 2000 },
    { width: 1000, height: 2000 },
  ];

  assert.deepEqual(getSlots(10, sizes, 655), [
    { x: 8, y: 9.5, width: 314.5, height: 629 },
    { x: 332.5, y: 9.5, width: 314.5, height: 629 },
  ]);
  assert.deepEqual(getSlots(10, sizes, 855), [
    { x: 108, y: 9.5, width: 314.5, height: 629 },
    { x: 432.5, y: 9.5, width: 314.5, height: 629 },
  ]);
  assert.deepEqual(getSlots(10, sizes, 1055), [
    { x: 208, y: 9.5, width: 314.5, height: 629 },
    { x: 532.5, y: 9.5, width: 314.5, height: 629 },
  ]);
});

test("宽图随可用宽度缩小并保持完整比例", () => {
  assert.deepEqual(getSlots(10, [
    { width: 2000, height: 1000 },
    { width: 2000, height: 1000 },
  ], 855), [
    { x: 108, y: 245.375, width: 314.5, height: 157.25 },
    { x: 432.5, y: 245.375, width: 314.5, height: 157.25 },
  ]);
});

test("间距被约束在 0 到 40", () => {
  const sizes = [
    { width: 2000, height: 1000 },
    { width: 2000, height: 1000 },
  ];
  assert.equal(getSlots(-1, sizes, 855)[0].width, 319.5);
  assert.equal(getSlots(50, sizes, 855)[0].width, 299.5);
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
