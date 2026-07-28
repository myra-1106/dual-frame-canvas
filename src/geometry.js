export const CANVAS_WIDTH = 648;
export const CANVAS_HEIGHT = 648;

export function getSlots(
  gap,
  imageSizes = [
    { width: 1, height: 2 },
    { width: 1, height: 2 },
  ],
) {
  const safeGap = Math.min(40, Math.max(0, Number(gap) || 0));
  const aspectRatios = imageSizes.map(({ width, height }) => width / height);
  const height = Math.min(
    CANVAS_HEIGHT,
    (CANVAS_WIDTH - safeGap) / (aspectRatios[0] + aspectRatios[1]),
  );
  const widths = aspectRatios.map((aspectRatio) => height * aspectRatio);
  const groupWidth = widths[0] + safeGap + widths[1];
  const startX = (CANVAS_WIDTH - groupWidth) / 2;
  const y = (CANVAS_HEIGHT - height) / 2;

  return [
    { x: startX, y, width: widths[0], height },
    { x: startX + widths[0] + safeGap, y, width: widths[1], height },
  ];
}

export function getCoverState(imageWidth, imageHeight, slot) {
  const scale = Math.max(slot.width / imageWidth, slot.height / imageHeight);
  return {
    scale,
    x: slot.x + (slot.width - imageWidth * scale) / 2,
    y: slot.y + (slot.height - imageHeight * scale) / 2,
  };
}

export function clampImageState(state, imageWidth, imageHeight, slot) {
  const minimumScale = Math.max(
    slot.width / imageWidth,
    slot.height / imageHeight,
  );
  const scale = Math.max(minimumScale, state.scale);
  const drawnWidth = imageWidth * scale;
  const drawnHeight = imageHeight * scale;

  return {
    scale,
    x: Math.min(slot.x, Math.max(slot.x + slot.width - drawnWidth, state.x)),
    y: Math.min(slot.y, Math.max(slot.y + slot.height - drawnHeight, state.y)),
  };
}

export function zoomAtPoint(state, factor, point, imageSize, slot) {
  const nextScale = state.scale * factor;
  const ratio = nextScale / state.scale;
  const nextState = {
    scale: nextScale,
    x: point.x - (point.x - state.x) * ratio,
    y: point.y - (point.y - state.y) * ratio,
  };

  return clampImageState(
    nextState,
    imageSize.width,
    imageSize.height,
    slot,
  );
}
