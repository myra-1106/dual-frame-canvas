# 双图拼接画布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个独立、无后端、可在 iPhone 和 PC 使用的双图拼接工具，并导出精确的 1055 × 648 PNG。

**Architecture:** 原生静态单页由展示层、纯计算模块和交互控制器组成。纯计算模块负责布局、缩放与边界约束并使用 Node 内置测试；浏览器控制器只负责将指针、触摸、文件和 Canvas 事件映射到这些计算函数。

**Tech Stack:** HTML5、CSS、原生 ES Modules、Canvas 2D、Pointer Events、Node.js 内置测试运行器。

## Global Constraints

- 与 `/Users/myra/Documents/合集网站` 完全独立。
- 逻辑画布与导出 PNG 固定为 1055 × 648。
- 两侧区域等宽，图片间距范围 0–40px，默认 10px。
- 只复刻参考图的双图排列，不复刻其网页 UI。
- 不使用后端或前端框架。
- 重置保留已上传图片；所有图片数据只在当前浏览器处理。

---

### Task 1: 画布几何与图片约束

**Files:**
- Create: `package.json`
- Create: `src/geometry.js`
- Create: `tests/geometry.test.js`

**Interfaces:**
- Produces: `getSlots(gap)`, `getCoverState(imageWidth, imageHeight, slot)`,
  `clampImageState(state, imageWidth, imageHeight, slot)`,
  `zoomAtPoint(state, factor, point, imageSize, slot)`.

- [ ] **Step 1: 写入失败测试**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { getSlots, getCoverState, clampImageState, zoomAtPoint } from "../src/geometry.js";

test("10px 间距生成水平居中的等宽区域", () => {
  assert.deepEqual(getSlots(10), [
    { x: 0, y: 0, width: 522.5, height: 648 },
    { x: 532.5, y: 0, width: 522.5, height: 648 },
  ]);
});

test("间距被约束在 0 到 40", () => {
  assert.equal(getSlots(-1)[0].width, 527.5);
  assert.equal(getSlots(50)[0].width, 507.5);
});

test("竖图初始状态覆盖区域并居中", () => {
  assert.deepEqual(getCoverState(1000, 2000, { x: 0, y: 0, width: 500, height: 600 }), {
    scale: 0.5, x: 0, y: -200,
  });
});

test("拖动不会在区域内留下空白", () => {
  assert.deepEqual(
    clampImageState({ scale: 1, x: 100, y: -900 }, 800, 1000, { x: 0, y: 0, width: 500, height: 600 }),
    { scale: 1, x: 0, y: -400 },
  );
});

test("缩放保持指针下方的图片位置", () => {
  assert.deepEqual(
    zoomAtPoint(
      { scale: 1, x: 0, y: 0 }, 2, { x: 250, y: 300 },
      { width: 500, height: 600 }, { x: 0, y: 0, width: 500, height: 600 },
    ),
    { scale: 2, x: -250, y: -300 },
  );
});
```

- [ ] **Step 2: 运行 `npm test`，确认因模块缺失而失败**
- [ ] **Step 3: 实现最小几何函数，使用 `Math.max(slot.width / imageWidth, slot.height / imageHeight)` 计算覆盖缩放，并按绘制后尺寸约束 `x/y`**
- [ ] **Step 4: 再次运行 `npm test`，确认全部通过**

### Task 2: 页面结构与 Apple 风格响应式界面

**Files:**
- Create: `index.html`
- Create: `styles.css`

**Interfaces:**
- Consumes: `app.js` 暴露的 DOM 行为。
- Produces: `#stage`, `#render-canvas`, 两个上传输入、四个范围控件、
  `#swap-button`, `#reset-button`, `#export-button`, `#status`。

- [ ] **Step 1: 创建语义化页面结构**

```html
<main class="app-shell">
  <header class="hero">
    <p class="eyebrow">DUAL FRAME</p>
    <h1>双图拼接画布</h1>
    <p>将两张图片并排整理成一张 1055 × 648 PNG。</p>
  </header>
  <section class="workspace" aria-label="双图编辑器">
    <div class="stage-shell"><div id="stage"><canvas id="render-canvas" width="1055" height="648"></canvas></div></div>
    <aside class="controls">…</aside>
  </section>
</main>
```

- [ ] **Step 2: 添加左右上传覆盖层、选中状态标签、滑块与操作按钮，并保证所有 input 均有 label**
- [ ] **Step 3: 添加浅灰背景、白色卡片、系统字体、细边框与轻阴影；画布使用 `aspect-ratio: 1055 / 648`**
- [ ] **Step 4: 添加小于 800px 的单列布局、44px 触控目标、安全区内边距与减少动态效果媒体查询**

### Task 3: 上传、选择、拖动、缩放与滑块

**Files:**
- Create: `app.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1 的四个几何函数和 Task 2 的 DOM 节点。
- Produces: 左右图片状态 `{ image, fileName, scale, x, y }`，以及统一的 `render()`。

- [ ] **Step 1: 创建状态与 `render()`，用 Canvas clip 分别绘制两个区域，并在选中区域绘制 2px 蓝色内描边**
- [ ] **Step 2: 实现文件输入和拖放；使用 `createImageBitmap`，失败时回退到 `Image`，并将错误写入 `#status`**
- [ ] **Step 3: 用 Pointer Events 实现单指/鼠标拖动；拖动坐标按 `1055 / stage.clientWidth` 换算**
- [ ] **Step 4: 记录两根活动指针距离，实现以双指中点为锚点的缩放；在画布 `wheel` 事件中调用同一缩放函数**
- [ ] **Step 5: 连接缩放、左右、上下滑块到当前选中图片；每次更新后调用 `clampImageState`**
- [ ] **Step 6: 间距变化时调用 `getSlots`，保持图片视觉中心并重新约束状态**

### Task 4: 交换、重置、导出与端到端核验

**Files:**
- Modify: `app.js`
- Create: `tests/smoke.test.js`

**Interfaces:**
- Consumes: 当前双图状态与 `render()`。
- Produces: `swapImages()`, `resetEditor()`, `exportPng()`。

- [ ] **Step 1: 添加静态页面冒烟测试**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("页面提供完整编辑控件", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const id of ["render-canvas", "gap", "scale", "offset-x", "offset-y", "swap-button", "reset-button", "export-button"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /width="1055" height="648"/);
});
```

- [ ] **Step 2: 运行 `npm test`，确认冒烟测试因页面控件尚不完整时失败；补齐缺失控件后确认通过**
- [ ] **Step 3: 实现交换操作，交换完整图片对象并保持当前选中侧**
- [ ] **Step 4: 实现重置操作，将 gap 设为 10，并对已有图片重新调用 `getCoverState`**
- [ ] **Step 5: 实现导出操作：先调用 `render()`，再使用 `canvas.toBlob(..., "image/png")` 下载 `dual-frame-1055x648.png`**
- [ ] **Step 6: 运行 `npm test` 和 `npm run check`，确认测试及 JavaScript 语法检查通过**
- [ ] **Step 7: 用本地静态服务器分别检查桌面与窄屏布局，验证上传、拖动、滚轮、交换、重置和导出 PNG 尺寸**

