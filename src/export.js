export function decodeDataUrl(dataUrl) {
  const [header, payload] = dataUrl.split(",");
  const mimeType = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { mimeType, bytes };
}

export function getExportSpec(canvasWidth, canvasHeight = 648, multiplier = 4) {
  const width = canvasWidth * multiplier;
  const height = canvasHeight * multiplier;

  return {
    width,
    height,
    mimeType: "image/png",
    fileName: `dual-frame-${width}x${height}.png`,
  };
}
