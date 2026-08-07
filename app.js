import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  clampImageState,
  getCoverState,
  getSlots,
  zoomAtPoint,
} from "./src/geometry.js?v=10";
import { decodeDataUrl, getExportSpec } from "./src/export.js?v=10";

const canvas = document.querySelector("#render-canvas");
const context = canvas.getContext("2d");
const stage = document.querySelector("#stage");
const fileInputs = [
  document.querySelector("#left-file"),
  document.querySelector("#right-file"),
];
const dropZones = [
  document.querySelector("#left-drop-zone"),
  document.querySelector("#right-drop-zone"),
];
const canvasWidthInput = document.querySelector("#canvas-width");
const gapInput = document.querySelector("#gap");
const scaleInput = document.querySelector("#scale");
const offsetXInput = document.querySelector("#offset-x");
const offsetYInput = document.querySelector("#offset-y");
const imageControls = [scaleInput, offsetXInput, offsetYInput];
const status = document.querySelector("#status");
const toast = document.querySelector("#toast");

const editor = {
  canvasWidth: CANVAS_WIDTH,
  gap: 10,
  selected: 0,
  images: [emptyImageState(), emptyImageState()],
};

const pointers = new Map();
let dragOrigin = null;
let pinchOrigin = null;

function emptyImageState() {
  return { image: null, fileName: "", scale: 1, x: 0, y: 0 };
}

function imageSize(item) {
  return {
    width: item.image.naturalWidth || item.image.width,
    height: item.image.naturalHeight || item.image.height,
  };
}

function getLayoutSizes() {
  return editor.images.map((item) =>
    item.image ? imageSize(item) : { width: 1, height: 2 },
  );
}

function getCurrentSlots(gap = editor.gap, canvasWidth = editor.canvasWidth) {
  return getSlots(gap, getLayoutSizes(), canvasWidth);
}

function getMinimumScale(item, slot) {
  const size = imageSize(item);
  return Math.max(slot.width / size.width, slot.height / size.height);
}

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (editor.canvasWidth / rect.width),
    y: (event.clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
  };
}

function sideAtPoint(point) {
  const slots = getCurrentSlots();
  if (point.x <= slots[0].x + slots[0].width) return 0;
  if (point.x >= slots[1].x) return 1;
  return point.x < editor.canvasWidth / 2 ? 0 : 1;
}

function drawCanvas(targetContext, showSelection = true) {
  const slots = getCurrentSlots();
  targetContext.clearRect(0, 0, editor.canvasWidth, CANVAS_HEIGHT);
  targetContext.fillStyle = "#ffffff";
  targetContext.fillRect(0, 0, editor.canvasWidth, CANVAS_HEIGHT);

  slots.forEach((slot, index) => {
    const item = editor.images[index];
    targetContext.save();
    targetContext.beginPath();
    targetContext.rect(slot.x, slot.y, slot.width, slot.height);
    targetContext.clip();
    targetContext.fillStyle = "#f3f3f5";
    targetContext.fillRect(slot.x, slot.y, slot.width, slot.height);

    if (item.image) {
      const size = imageSize(item);
      targetContext.imageSmoothingEnabled = true;
      targetContext.imageSmoothingQuality = "high";
      targetContext.drawImage(
        item.image,
        item.x,
        item.y,
        size.width * item.scale,
        size.height * item.scale,
      );
    }
    targetContext.restore();
  });

  if (showSelection) {
    const selectedSlot = slots[editor.selected];
    targetContext.save();
    targetContext.strokeStyle = "#0071e3";
    targetContext.lineWidth = 2;
    targetContext.strokeRect(
      selectedSlot.x - 2,
      selectedSlot.y - 2,
      selectedSlot.width + 4,
      selectedSlot.height + 4,
    );
    targetContext.restore();
  }
}

function render(showSelection = true) {
  drawCanvas(context, showSelection);
  const slots = getCurrentSlots();
  updateDropZones(slots);
}

function updateDropZones(slots) {
  dropZones.forEach((zone, index) => {
    const slot = slots[index];
    zone.style.left = `${(slot.x / editor.canvasWidth) * 100}%`;
    zone.style.width = `${(slot.width / editor.canvasWidth) * 100}%`;
    zone.hidden = Boolean(editor.images[index].image);
  });
}

function selectSide(index) {
  editor.selected = index;
  document.querySelector("#selection-title").textContent =
    index === 0 ? "左侧图片" : "右侧图片";
  document.querySelectorAll(".segment-button").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.side) === index);
  });
  syncControls();
  render();
}

function syncControls() {
  const item = editor.images[editor.selected];
  const disabled = !item.image;
  imageControls.forEach((control) => {
    control.disabled = disabled;
  });

  if (disabled) {
    scaleInput.value = "100";
    offsetXInput.value = "0";
    offsetYInput.value = "0";
  } else {
    const slot = getCurrentSlots()[editor.selected];
    const size = imageSize(item);
    const minimumScale = getMinimumScale(item, slot);
    const widthOverflow = Math.max(0, size.width * item.scale - slot.width);
    const heightOverflow = Math.max(0, size.height * item.scale - slot.height);
    const centeredX = slot.x - widthOverflow / 2;
    const centeredY = slot.y - heightOverflow / 2;
    scaleInput.value = String(
      Math.round(Math.min(600, (item.scale / minimumScale) * 100)),
    );
    offsetXInput.value = widthOverflow
      ? String(Math.round(((item.x - centeredX) / (widthOverflow / 2)) * 100))
      : "0";
    offsetYInput.value = heightOverflow
      ? String(Math.round(((item.y - centeredY) / (heightOverflow / 2)) * 100))
      : "0";
  }

  document.querySelector("#scale-value").value = `${scaleInput.value}%`;
  document.querySelector("#offset-x-value").value = offsetXInput.value;
  document.querySelector("#offset-y-value").value = offsetYInput.value;
  document.querySelector("#gap-value").value = `${editor.gap}px`;
  document.querySelector("#canvas-width-value").value =
    `${editor.canvasWidth}px`;
  document.querySelector("#canvas-size-label").lastChild.textContent =
    `${editor.canvasWidth} × 648 px`;
}

async function decodeImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }

  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // Safari 对部分图片格式需使用 Image 回退。
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadFile(index, file) {
  if (!file) return;
  status.textContent = "";

  try {
    const image = await decodeImage(file);
    const oldSlots = getCurrentSlots();
    editor.images[index] = {
      image,
      fileName: file.name,
      scale: 1,
      x: 0,
      y: 0,
    };
    const newSlots = getCurrentSlots();
    editor.images.forEach((item, itemIndex) => {
      if (!item.image || itemIndex === index) return;
      const oldSlot = oldSlots[itemIndex];
      const newSlot = newSlots[itemIndex];
      item.x +=
        newSlot.x + newSlot.width / 2 - (oldSlot.x + oldSlot.width / 2);
      item.y +=
        newSlot.y + newSlot.height / 2 - (oldSlot.y + oldSlot.height / 2);
      const size = imageSize(item);
      Object.assign(
        item,
        clampImageState(item, size.width, size.height, newSlot),
      );
    });
    const slot = newSlots[index];
    const initial = getCoverState(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      slot,
    );
    editor.images[index] = { image, fileName: file.name, ...initial };
    selectSide(index);
  } catch {
    status.textContent = "这张图片无法读取，请尝试 JPG、PNG 或 WebP。";
  }
}

function setScale(percent, anchor) {
  const item = editor.images[editor.selected];
  if (!item.image) return;
  const slot = getCurrentSlots()[editor.selected];
  const minimumScale = getMinimumScale(item, slot);
  const targetScale = minimumScale * (percent / 100);
  const point = anchor || {
    x: slot.x + slot.width / 2,
    y: slot.y + slot.height / 2,
  };
  const factor = targetScale / item.scale;
  const size = imageSize(item);
  Object.assign(item, zoomAtPoint(item, factor, point, size, slot));
  syncControls();
  render();
}

function setOffset(axis, percent) {
  const item = editor.images[editor.selected];
  if (!item.image) return;
  const slot = getCurrentSlots()[editor.selected];
  const size = imageSize(item);
  const overflow =
    axis === "x"
      ? Math.max(0, size.width * item.scale - slot.width)
      : Math.max(0, size.height * item.scale - slot.height);
  const start = axis === "x" ? slot.x : slot.y;
  item[axis] = start - overflow / 2 + (Number(percent) / 100) * (overflow / 2);
  Object.assign(item, clampImageState(item, size.width, size.height, slot));
  syncControls();
  render();
}

function changeGap(nextGap) {
  const oldSlots = getCurrentSlots();
  const anchors = editor.images.map((item, index) => {
    if (!item.image) return null;
    const oldSlot = oldSlots[index];
    return {
      x: (oldSlot.x + oldSlot.width / 2 - item.x) / item.scale,
      y: (oldSlot.y + oldSlot.height / 2 - item.y) / item.scale,
    };
  });

  editor.gap = Math.min(40, Math.max(0, Number(nextGap)));
  const newSlots = getCurrentSlots();
  editor.images.forEach((item, index) => {
    if (!item.image) return;
    const slot = newSlots[index];
    item.x = slot.x + slot.width / 2 - anchors[index].x * item.scale;
    item.y = slot.y + slot.height / 2 - anchors[index].y * item.scale;
    const size = imageSize(item);
    Object.assign(item, clampImageState(item, size.width, size.height, slot));
  });
  syncControls();
  render();
}

function changeCanvasWidth(nextWidth) {
  const width = Math.min(1055, Math.max(655, Number(nextWidth)));
  const shiftX = (width - editor.canvasWidth) / 2;

  editor.images.forEach((item) => {
    if (item.image) item.x += shiftX;
  });
  editor.canvasWidth = width;
  canvas.width = width;
  stage.style.aspectRatio = `${width} / ${CANVAS_HEIGHT}`;
  canvasWidthInput.value = String(width);
  canvas.setAttribute("aria-label", `${width} × 648 双图画布`);
  syncControls();
  render();
}

function swapImages() {
  const oldSlots = getCurrentSlots();
  [editor.images[0], editor.images[1]] = [editor.images[1], editor.images[0]];
  const slots = getCurrentSlots();
  editor.images.forEach((item, index) => {
    if (!item.image) return;
    const size = imageSize(item);
    const previousSlot = oldSlots[1 - index];
    item.x +=
      slots[index].x +
      slots[index].width / 2 -
      (previousSlot.x + previousSlot.width / 2);
    item.y +=
      slots[index].y +
      slots[index].height / 2 -
      (previousSlot.y + previousSlot.height / 2);
    Object.assign(item, clampImageState(item, size.width, size.height, slots[index]));
  });
  syncControls();
  render();
}

function resetEditor() {
  changeCanvasWidth(CANVAS_WIDTH);
  editor.gap = 10;
  gapInput.value = "10";
  const slots = getCurrentSlots(10);
  editor.images.forEach((item, index) => {
    if (!item.image) return;
    const size = imageSize(item);
    Object.assign(item, getCoverState(size.width, size.height, slots[index]));
  });
  status.textContent = "";
  syncControls();
  render();
}

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function downloadPng(dataUrl, fileName) {
  const { mimeType, bytes } = decodeDataUrl(dataUrl);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 120);
  showToast("无损 PNG 已开始下载");
}

function isTouchDevice() {
  // macOS 桌面端明确排除，避免触控板误判
  if (/Macintosh/i.test(navigator.userAgent) && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    return false;
  }
  return (
    /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
  );
}

function clearImages() {
  editor.images[0] = { image: null, fileName: "", scale: 1, x: 0, y: 0 };
  editor.images[1] = { image: null, fileName: "", scale: 1, x: 0, y: 0 };
  status.textContent = "";
  syncControls();
  render();
}

function exportPng() {
  try {
    const spec = getExportSpec(editor.canvasWidth, CANVAS_HEIGHT);
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = spec.width;
    exportCanvas.height = spec.height;
    const exportContext = exportCanvas.getContext("2d");
    exportContext.scale(4, 4);
    drawCanvas(exportContext, false);

    const dataUrl = exportCanvas.toDataURL(spec.mimeType);

    // 桌面端：直接触发浏览器下载
    if (!isTouchDevice()) {
      downloadPng(dataUrl, spec.fileName);
      clearImages();
      return;
    }

    // 移动端：使用系统分享面板保存到图库
    const { mimeType, bytes } = decodeDataUrl(dataUrl);
    const file = new File([bytes], spec.fileName, { type: mimeType });

    if (navigator.canShare?.({ files: [file] })) {
      showToast("正在打开系统保存面板…");
      navigator
        .share({
          files: [file],
          title: "双图拼接画布",
        })
        .catch((error) => {
          if (error.name !== "AbortError") downloadPng(dataUrl, spec.fileName);
        })
        .finally(() => clearImages());
      return;
    }

    downloadPng(dataUrl, spec.fileName);
    clearImages();
  } catch {
    status.textContent = "导出失败，请刷新页面后再试。";
    showToast("导出失败，请刷新页面后再试");
  }
}

dropZones.forEach((zone, index) => {
  zone.addEventListener("click", () => fileInputs[index].click());
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("is-dragging");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("is-dragging"));
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("is-dragging");
    loadFile(index, event.dataTransfer.files[0]);
  });
});

fileInputs.forEach((input, index) => {
  input.addEventListener("change", async () => {
    const files = Array.from(input.files);
    if (files.length === 0) return;
    await loadFile(index, files[0]);
    if (files.length >= 2) {
      await loadFile(1 - index, files[1]);
    }
    if (files.length > 2) {
      showToast(`已加载前 2 张（共选了 ${files.length} 张）`);
    }
    input.value = "";
  });
});

document.querySelectorAll("[data-replace]").forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.replace);
    selectSide(index);
    fileInputs[index].click();
  });
});

document.querySelectorAll(".segment-button").forEach((button) => {
  button.addEventListener("click", () => selectSide(Number(button.dataset.side)));
});

canvas.addEventListener("pointerdown", (event) => {
  const point = getPoint(event);
  const side = sideAtPoint(point);
  selectSide(side);
  if (!editor.images[side].image) {
    fileInputs[side].click();
    return;
  }

  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, point);
  dragOrigin = {
    point,
    x: editor.images[side].x,
    y: editor.images[side].y,
  };
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId)) return;
  const point = getPoint(event);
  pointers.set(event.pointerId, point);
  const item = editor.images[editor.selected];
  const slot = getCurrentSlots()[editor.selected];
  const size = imageSize(item);

  if (pointers.size === 2) {
    const [first, second] = [...pointers.values()];
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    if (!pinchOrigin) {
      pinchOrigin = { distance, scale: item.scale };
      return;
    }
    const targetScale = Math.min(
      getMinimumScale(item, slot) * 6,
      pinchOrigin.scale * (distance / pinchOrigin.distance),
    );
    const next = zoomAtPoint(
      item,
      targetScale / item.scale,
      center,
      size,
      slot,
    );
    Object.assign(item, next);
  } else if (dragOrigin && pointers.size === 1) {
    item.x = dragOrigin.x + point.x - dragOrigin.point.x;
    item.y = dragOrigin.y + point.y - dragOrigin.point.y;
    Object.assign(item, clampImageState(item, size.width, size.height, slot));
  }

  syncControls();
  render();
});

function endPointer(event) {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinchOrigin = null;
  if (pointers.size === 0) dragOrigin = null;
}

canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

canvas.addEventListener(
  "wheel",
  (event) => {
    const point = getPoint(event);
    const side = sideAtPoint(point);
    if (!editor.images[side].image) return;
    event.preventDefault();
    if (editor.selected !== side) selectSide(side);
    const item = editor.images[side];
    const slot = getCurrentSlots()[side];
    const minimumScale = getMinimumScale(item, slot);
    const targetScale = Math.min(
      minimumScale * 6,
      Math.max(minimumScale, item.scale * Math.exp(-event.deltaY * 0.0015)),
    );
    setScale((targetScale / minimumScale) * 100, point);
  },
  { passive: false },
);

canvasWidthInput.addEventListener("input", () =>
  changeCanvasWidth(canvasWidthInput.value),
);
gapInput.addEventListener("input", () => changeGap(gapInput.value));
scaleInput.addEventListener("input", () => setScale(Number(scaleInput.value)));
offsetXInput.addEventListener("input", () => setOffset("x", offsetXInput.value));
offsetYInput.addEventListener("input", () => setOffset("y", offsetYInput.value));
document.querySelector("#swap-button").addEventListener("click", swapImages);
document.querySelector("#reset-button").addEventListener("click", resetEditor);
document.querySelector("#export-button").addEventListener("click", exportPng);

syncControls();
render();
