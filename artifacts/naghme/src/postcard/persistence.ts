export type BackgroundKind = 'cover' | 'custom' | 'solid';
export type TextAlignment = 'right' | 'center' | 'left';
export type ExportFormat = 'jpg' | 'png';
export type CanvasRatio = 'square' | 'portrait' | 'landscape' | 'story' | 'custom';
export type PersianFont =
  | 'Lalezar'
  | 'Vazirmatn'
  | 'Amiri'
  | 'Cairo'
  | 'Rakkas'
  | 'ElMessiri'
  | 'Tajawal'
  | 'Lateef'
  | 'ArefRuqaa'
  | 'NotoSansArabic';
export type FilterName =
  | 'grayscale'
  | 'vintage'
  | 'sepia'
  | 'cool'
  | 'warm'
  | 'invert'
  | 'noise'
  | 'contrast';

export interface PostcardTransform {
  x: number;
  y: number;
  scale: number;
}

export interface PostcardStickerState extends PostcardTransform {
  id: string;
  uri: string;
  opacity: number;
  borderRadius: number;
}

export interface PostcardSettings {
  version: 1;
  ratio: CanvasRatio;
  customWidth: number;
  customHeight: number;
  backgroundKind: BackgroundKind;
  customBackgroundUri: string | null;
  solidBackground: string;
  blurRadius: number;
  fontChoice: PersianFont;
  alignment: TextAlignment;
  textColor: string;
  textSize: number;
  textTransform: PostcardTransform;
  stickers: PostcardStickerState[];
  activeFilters: FilterName[];
  exportFormat: ExportFormat;
}

const CANVAS_RATIOS: readonly CanvasRatio[] = [
  'square',
  'portrait',
  'landscape',
  'story',
  'custom',
];
const BACKGROUND_KINDS: readonly BackgroundKind[] = ['cover', 'custom', 'solid'];
const ALIGNMENTS: readonly TextAlignment[] = ['right', 'center', 'left'];
const EXPORT_FORMATS: readonly ExportFormat[] = ['jpg', 'png'];
const FONTS: readonly PersianFont[] = [
  'Lalezar',
  'Vazirmatn',
  'Amiri',
  'Cairo',
  'Rakkas',
  'ElMessiri',
  'Tajawal',
  'Lateef',
  'ArefRuqaa',
  'NotoSansArabic',
];
const FILTERS: readonly FilterName[] = [
  'grayscale',
  'vintage',
  'sepia',
  'cool',
  'warm',
  'invert',
  'noise',
  'contrast',
];

export function createDefaultPostcardSettings(solidBackground = '#2B2423'): PostcardSettings {
  return {
    version: 1,
    ratio: 'portrait',
    customWidth: 1080,
    customHeight: 1350,
    backgroundKind: 'cover',
    customBackgroundUri: null,
    solidBackground,
    blurRadius: 28,
    fontChoice: 'Vazirmatn',
    alignment: 'center',
    textColor: '#F6F0E8',
    textSize: 18,
    textTransform: { x: 0, y: 0, scale: 1 },
    stickers: [],
    activeFilters: [],
    exportFormat: 'jpg',
  };
}

export function serializePostcardSettings(settings: PostcardSettings): string {
  return JSON.stringify(settings);
}

export function parsePostcardSettings(
  raw: string | null | undefined,
  solidBackground = '#2B2423',
): PostcardSettings {
  const fallback = createDefaultPostcardSettings(solidBackground);
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!isRecord(parsed)) return fallback;

  const textTransform = parseTransform(parsed.textTransform, fallback.textTransform);
  const stickers = Array.isArray(parsed.stickers)
    ? parsed.stickers
        .map((value, index) => parseSticker(value, index))
        .filter((value): value is PostcardStickerState => value !== null)
    : fallback.stickers;
  const filters = Array.isArray(parsed.activeFilters)
    ? parsed.activeFilters.filter((value): value is FilterName => isOneOf(value, FILTERS))
    : fallback.activeFilters;

  return {
    version: 1,
    ratio: isOneOf(parsed.ratio, CANVAS_RATIOS) ? parsed.ratio : fallback.ratio,
    customWidth: boundedNumber(parsed.customWidth, fallback.customWidth, 120, 4096),
    customHeight: boundedNumber(parsed.customHeight, fallback.customHeight, 120, 4096),
    backgroundKind: isOneOf(parsed.backgroundKind, BACKGROUND_KINDS)
      ? parsed.backgroundKind
      : fallback.backgroundKind,
    customBackgroundUri: nullableString(parsed.customBackgroundUri),
    solidBackground: stringValue(parsed.solidBackground, fallback.solidBackground),
    blurRadius: boundedNumber(parsed.blurRadius, fallback.blurRadius, 0, 50),
    fontChoice: isOneOf(parsed.fontChoice, FONTS) ? parsed.fontChoice : fallback.fontChoice,
    alignment: isOneOf(parsed.alignment, ALIGNMENTS) ? parsed.alignment : fallback.alignment,
    textColor: stringValue(parsed.textColor, fallback.textColor),
    textSize: boundedNumber(parsed.textSize, fallback.textSize, 10, 100),
    textTransform,
    stickers,
    activeFilters: filters,
    exportFormat: isOneOf(parsed.exportFormat, EXPORT_FORMATS)
      ? parsed.exportFormat
      : fallback.exportFormat,
  };
}

function parseSticker(value: unknown, index: number): PostcardStickerState | null {
  if (!isRecord(value)) return null;
  const uri = stringValue(value.uri, '');
  if (!uri) return null;
  return {
    id: stringValue(value.id, `sticker-${index}`),
    uri,
    opacity: boundedNumber(value.opacity, 1, 0.1, 1),
    borderRadius: boundedNumber(value.borderRadius, 14, 0, 100),
    x: boundedNumber(value.x, 0, -2000, 2000),
    y: boundedNumber(value.y, 0, -2000, 2000),
    scale: boundedNumber(value.scale, 1, 0.35, 2.8),
  };
}

function parseTransform(value: unknown, fallback: PostcardTransform): PostcardTransform {
  if (!isRecord(value)) return fallback;
  return {
    x: boundedNumber(value.x, fallback.x, -2000, 2000),
    y: boundedNumber(value.y, fallback.y, -2000, 2000),
    scale: boundedNumber(value.scale, fallback.scale, 0.62, 2.2),
  };
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}