import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { inflateSync } from 'fflate';
import { Platform } from 'react-native';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export async function getDominantCoverColor(
  uri: string,
  fallback: string,
): Promise<string> {
  try {
    const sourceUri = await resolveCoverUri(uri);
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: 32 } }],
      {
        base64: true,
        compress: 1,
        format: ImageManipulator.SaveFormat.PNG,
      },
    );
    if (!result.base64) return fallback;
    return averagePngColor(result.base64) ?? fallback;
  } catch {
    return fallback;
  }
}

async function resolveCoverUri(uri: string): Promise<string> {
  if (Platform.OS === 'web' || !/^https?:\/\//i.test(uri) || !FileSystem.cacheDirectory) {
    return uri;
  }
  const cacheKey = hashUri(uri);
  const localUri = `${FileSystem.cacheDirectory}naghme-cover-${cacheKey}.img`;
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) return localUri;
    const downloaded = await FileSystem.downloadAsync(uri, localUri);
    return downloaded.uri;
  } catch {
    return uri;
  }
}

export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return hex;
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${Number.parseInt(normalized.slice(0, 2), 16)}, ${Number.parseInt(
    normalized.slice(2, 4),
    16,
  )}, ${Number.parseInt(normalized.slice(4, 6), 16)}, ${safeAlpha})`;
}

function averagePngColor(base64: string): string | null {
  const bytes = decodeBase64(base64);
  if (bytes.length < 33 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    return null;
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Uint8Array[] = [];
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > bytes.length) return null;

    if (type === 'IHDR' && length >= 13) {
      width = readUint32(bytes, dataStart);
      height = readUint32(bytes, dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
    } else if (type === 'IDAT') {
      idatChunks.push(bytes.slice(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  const bytesPerPixelByType: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const bytesPerPixel = bytesPerPixelByType[colorType];
  if (!width || !height || bitDepth !== 8 || !bytesPerPixel || !idatChunks.length) return null;

  const compressed = new Uint8Array(idatChunks.reduce((total, chunk) => total + chunk.length, 0));
  let compressedOffset = 0;
  idatChunks.forEach((chunk) => {
    compressed.set(chunk, compressedOffset);
    compressedOffset += chunk.length;
  });

  let decoded: Uint8Array;
  try {
    decoded = inflateSync(compressed);
  } catch {
    return null;
  }

  const rowLength = width * bytesPerPixel;
  const expectedLength = height * (rowLength + 1);
  if (decoded.length < expectedLength) return null;

  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  let previousRow = new Uint8Array(rowLength);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (rowLength + 1);
    const filter = decoded[rowStart];
    const row = new Uint8Array(rowLength);
    for (let x = 0; x < rowLength; x += 1) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previousRow[x] ?? 0;
      const upLeft = x >= bytesPerPixel ? previousRow[x - bytesPerPixel] ?? 0 : 0;
      const raw = decoded[rowStart + x + 1];
      row[x] = (raw + predictor(filter, left, up, upLeft)) & 255;
    }

    for (let x = 0; x < width; x += 1) {
      const pixel = x * bytesPerPixel;
      if (colorType === 0) {
        red += row[pixel];
        green += row[pixel];
        blue += row[pixel];
      } else if (colorType === 4) {
        red += row[pixel];
        green += row[pixel];
        blue += row[pixel];
      } else {
        red += row[pixel];
        green += row[pixel + 1];
        blue += row[pixel + 2];
      }
      count += 1;
    }
    previousRow = row;
  }

  if (!count) return null;
  return `#${toHex(red / count)}${toHex(green / count)}${toHex(blue / count)}`;
}

function predictor(filter: number, left: number, up: number, upLeft: number): number {
  if (filter === 1) return left;
  if (filter === 2) return up;
  if (filter === 3) return Math.floor((left + up) / 2);
  if (filter === 4) return paeth(left, up, upLeft);
  return 0;
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 2 ** 24 +
    bytes[offset + 1] * 2 ** 16 +
    bytes[offset + 2] * 2 ** 8 +
    bytes[offset + 3]
  );
}

function hashUri(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}