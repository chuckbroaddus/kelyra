import { Platform } from 'react-native';

const OUT = 512;
const FILL = 0.92;

/** Punch a square plate off a circular school mark. Web canvas; native is a no-op. */
export async function punchSchoolLogo(uri: string): Promise<{ uri: string; mimeType: string }> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return { uri, mimeType: 'image/png' };
  }
  const image = await loadImage(uri);
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { uri, mimeType: 'image/png' };
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height);
  punchCircularPlate(pixels);
  const framed = fitTransparentSquare(pixels);
  const out = document.createElement('canvas');
  out.width = OUT;
  out.height = OUT;
  const outCtx = out.getContext('2d');
  if (!outCtx) return { uri, mimeType: 'image/png' };
  outCtx.putImageData(framed, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'));
  if (!blob) return { uri, mimeType: 'image/png' };
  return { uri: URL.createObjectURL(blob), mimeType: 'image/png' };
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that logo'));
    img.src = uri;
  });
}

function punchCircularPlate(image: ImageData) {
  const { data, width, height } = image;
  const bg = sampleCorners(data, width, height);
  floodFromEdges(data, width, height, bg, 58);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] && colorDist(data[i], data[i + 1], data[i + 2], bg) < 42) data[i + 3] = 0;
  }
  const square = Math.abs(width - height) / Math.max(width, height, 1) < 0.14;
  // Square plates get the inscribed circle even when corner samples differ
  // (studio shadow). Otherwise white corners survive on a circular seal.
  if (square) {
    applyCircleMask(data, width, height, 0.5, 0.5, 0.5, Math.max(1.2, Math.min(width, height) * 0.008));
  }
}

function fitTransparentSquare(src: ImageData): ImageData {
  const { data, width, height } = src;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = width - 1;
    maxY = height - 1;
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const cx = minX + bw / 2;
  const cy = minY + bh / 2;
  const scale = (OUT * FILL) / Math.max(bw, bh);
  const out = new ImageData(OUT, OUT);
  const dest = out.data;
  for (let y = 0; y < OUT; y += 1) {
    const sy = Math.round((y - OUT / 2) / scale + cy);
    if (sy < 0 || sy >= height) continue;
    for (let x = 0; x < OUT; x += 1) {
      const sx = Math.round((x - OUT / 2) / scale + cx);
      if (sx < 0 || sx >= width) continue;
      const si = (sy * width + sx) * 4;
      const di = (y * OUT + x) * 4;
      dest[di] = data[si];
      dest[di + 1] = data[si + 1];
      dest[di + 2] = data[si + 2];
      dest[di + 3] = data[si + 3];
    }
  }
  return out;
}

function sampleCorners(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const pts = [
    [1, 1],
    [6, 6],
    [width - 2, 1],
    [width - 7, 6],
    [1, height - 2],
    [6, height - 7],
    [width - 2, height - 2],
  ];
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (const [x, y] of pts) {
    const i = (y * width + x) * 4;
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  }
  const med = (arr: number[]) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)] ?? 0;
  return [med(rs), med(gs), med(bs)];
}

function colorDist(r: number, g: number, b: number, bg: [number, number, number]): number {
  return Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
}

function floodFromEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: [number, number, number],
  threshold: number,
) {
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const visit = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    seen[idx] = 1;
    const i = idx * 4;
    if (colorDist(data[i], data[i + 1], data[i + 2], bg) > threshold) return;
    data[i + 3] = 0;
    stack.push(x, y);
  };
  for (let x = 0; x < width; x += 1) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    visit(0, y);
    visit(width - 1, y);
  }
  while (stack.length) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }
}

function applyCircleMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  feather: number,
) {
  const px = cx * width;
  const py = cy * height;
  const r = radius * Math.min(width, height);
  const f = Math.max(1, feather);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      let keep = 1;
      if (d >= r + f) keep = 0;
      else if (d > r) keep = 1 - (d - r) / f;
      const i = (y * width + x) * 4 + 3;
      data[i] = Math.round(data[i] * keep);
    }
  }
}
