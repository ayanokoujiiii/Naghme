import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_API_KEY_STORAGE_KEY = 'naghme.gemini.apiKey';
const GEMINI_MODEL_STORAGE_KEY = 'naghme.gemini.model';
export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';

export interface GeminiRecommendation {
  title: string;
  recommendation: string;
  culturalNote: string;
}

export interface GeminiModelOption {
  name: string;
  displayName: string;
  description?: string;
}

export async function getGeminiApiKey(): Promise<string> {
  return (await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE_KEY))?.trim() ?? '';
}

export async function saveGeminiApiKey(value: string): Promise<void> {
  const key = value.trim();
  if (key) {
    await AsyncStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key);
  } else {
    await AsyncStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  }
}

export async function getGeminiModel(): Promise<string> {
  return (await AsyncStorage.getItem(GEMINI_MODEL_STORAGE_KEY))?.trim() || DEFAULT_GEMINI_MODEL;
}

export async function saveGeminiModel(value: string): Promise<void> {
  const model = normalizeModelName(value);
  if (model) {
    await AsyncStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model);
  } else {
    await AsyncStorage.removeItem(GEMINI_MODEL_STORAGE_KEY);
  }
}

export async function fetchAvailableGeminiModels(
  apiKey: string,
): Promise<GeminiModelOption[]> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) throw new Error('برای استعلام مدل‌ها ابتدا کلید Gemini را وارد کن.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`,
  );
  const body = await response.text();
  if (!response.ok) {
    throw createGeminiApiError(response.status, body, 'استعلام مدل‌های Gemini انجام نشد.');
  }

  let payload: { models?: Array<{
    name?: string;
    displayName?: string;
    description?: string;
    supportedGenerationMethods?: string[];
  }> };
  try {
    payload = JSON.parse(body) as typeof payload;
  } catch (parseError: unknown) {
    const message = parseError instanceof Error ? parseError.message : 'پاسخ JSON نامعتبر است.';
    console.error('[Gemini model fetch parse error]', message, body);
    throw new Error(`پاسخ استعلام مدل‌ها قابل خواندن نیست: ${message}`);
  }

  const models = (payload.models ?? [])
    .map((model) => {
      const name = normalizeModelName(model.name ?? '');
      return {
        name,
        displayName: model.displayName?.trim() || name,
        description: model.description?.trim(),
        supportedGenerationMethods: model.supportedGenerationMethods ?? [],
      };
    })
    .filter(
      (model) =>
        model.name.startsWith('gemini-') &&
        model.supportedGenerationMethods.includes('generateContent'),
    )
    .map(({ name, displayName, description }) => ({ name, displayName, description }));

  if (!models.length) {
    throw new Error('هیچ مدل متنیِ قابل استفاده‌ای برای این کلید پیدا نشد.');
  }
  return models;
}

export async function askGeminiForRecommendation(
  apiKey: string,
  archiveSummary: string,
  currentMood: string,
  selectedModel = DEFAULT_GEMINI_MODEL,
): Promise<GeminiRecommendation> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) throw new Error('کلید Gemini تنظیم نشده است.');
  const model = normalizeModelName(selectedModel) || DEFAULT_GEMINI_MODEL;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cleanKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `تو همراه موسیقی‌شناس و شاعر اپ فارسی «نغمه» هستی. از آرشیو شخصی زیر فقط یک قطعه برای امشب انتخاب کن. انتخابت باید به حال کاربر، مدتی که از آخرین شنیدن گذشته و حال‌وهوای ثبت‌شده در diary توجه کند. پاسخ فقط JSON معتبر با همین کلیدها باشد: title، recommendation، culturalNote. متن‌ها فارسی، صمیمی و کوتاه باشند؛ recommendation حداکثر ۳ جمله و culturalNote حداکثر ۲ جمله باشد. اگر اطلاعات فرهنگی قطعه قطعی نیست، ادعای تاریخی دقیق نکن و فقط درباره‌ی کیفیت شنیداری و زمینه‌ی کلی موسیقی بنویس.

حال امشب کاربر: ${currentMood}

آرشیو:
${archiveSummary}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.85,
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw createGeminiApiError(response.status, body, 'دریافت پیشنهاد از Gemini انجام نشد.');
  }

  const body = await response.text();
  let payload: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  try {
    payload = JSON.parse(body) as typeof payload;
  } catch (parseError: unknown) {
    const message = parseError instanceof Error ? parseError.message : 'پاسخ JSON نامعتبر است.';
    console.error('[Gemini recommendation parse error]', message, body);
    throw new Error(`پاسخ Gemini قابل خواندن نیست: ${message}`);
  }
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini پاسخ قابل استفاده‌ای برنگرداند.');

  const parsed = parseRecommendation(text);
  if (!parsed.title || !parsed.recommendation || !parsed.culturalNote) {
    throw new Error('پاسخ Gemini ساختار مورد انتظار را ندارد.');
  }
  return parsed;
}

function normalizeModelName(value: string): string {
  return value.trim().replace(/^models\//, '');
}

function createGeminiApiError(status: number, body: string, fallback: string): Error {
  let detail = body.trim();
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; status?: string } };
    detail = parsed.error?.message?.trim() || parsed.error?.status?.trim() || detail;
  } catch {
    // Keep the raw response for exact debugging when it is not JSON.
  }
  const message = detail ? `${fallback} (${status}): ${detail}` : `${fallback} (${status})`;
  console.error('[Gemini API error]', message, { status, body });
  return new Error(message);
}

function parseRecommendation(text: string): GeminiRecommendation {
  const withoutFence = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(withoutFence) as Partial<GeminiRecommendation>;
  return {
    title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
    recommendation:
      typeof parsed.recommendation === 'string' ? parsed.recommendation.trim() : '',
    culturalNote: typeof parsed.culturalNote === 'string' ? parsed.culturalNote.trim() : '',
  };
}