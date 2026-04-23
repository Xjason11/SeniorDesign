import { toByteArray } from "base64-js";
import jpeg from "jpeg-js";

export type ImageFeatureVector = number[];

const gridSize = 8;

export function extractImageFeatures(base64Image: string): ImageFeatureVector {
  const bytes = toByteArray(base64Image);
  const decoded = jpeg.decode(bytes, { useTArray: true });
  const features: number[] = [];

  for (let gridY = 0; gridY < gridSize; gridY += 1) {
    for (let gridX = 0; gridX < gridSize; gridX += 1) {
      features.push(getCellAverage(decoded, gridX, gridY));
    }
  }

  return normalizeFeatures(features);
}

export function getFeatureDistance(a: ImageFeatureVector, b: ImageFeatureVector): number {
  const length = Math.min(a.length, b.length);
  let total = 0;

  for (let index = 0; index < length; index += 1) {
    const difference = a[index] - b[index];
    total += difference * difference;
  }

  return Math.sqrt(total / length);
}

function getCellAverage(decoded: jpeg.RawImageData<Uint8Array>, gridX: number, gridY: number): number {
  const startX = Math.floor((decoded.width / gridSize) * gridX);
  const endX = Math.floor((decoded.width / gridSize) * (gridX + 1));
  const startY = Math.floor((decoded.height / gridSize) * gridY);
  const endY = Math.floor((decoded.height / gridSize) * (gridY + 1));
  let total = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 2) {
    for (let x = startX; x < endX; x += 2) {
      const pixelIndex = (y * decoded.width + x) * 4;
      const red = decoded.data[pixelIndex];
      const green = decoded.data[pixelIndex + 1];
      const blue = decoded.data[pixelIndex + 2];
      total += (red + green + blue) / 3;
      count += 1;
    }
  }

  return count === 0 ? 0 : total / count;
}

function normalizeFeatures(features: number[]): number[] {
  const average = features.reduce((sum, value) => sum + value, 0) / features.length;
  const centered = features.map((value) => value - average);
  const scale = Math.max(...centered.map((value) => Math.abs(value)), 1);

  return centered.map((value) => value / scale);
}
