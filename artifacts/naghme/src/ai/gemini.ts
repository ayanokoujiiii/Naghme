import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_API_KEY_STORAGE_KEY = 'naghme.gemini.apiKey';
const GEMINI_MODEL = 'gemini-2.5-flash';

export interface GeminiRecommendation {
  title: string;
  recommendation: string;
  culturalNote: string;
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

export async function askGeminiForRecommendation(
  apiKey: string,
  archiveSummary: string,
  currentMood: string,
): Promise<GeminiRecommendation> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) throw new Error('کلید Gemini تنظیم نشده است.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(cleanKey)}`,
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
    throw new Error(body.includes('API key') ? 'کلید Gemini معتبر نیست.' : 'دریافت پیشنهاد از Gemini انجام نشد.');
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini پاسخ قابل استفاده‌ای برنگرداند.');

  const parsed = parseRecommendation(text);
  if (!parsed.title || !parsed.recommendation || !parsed.culturalNote) {
    throw new Error('پاسخ Gemini ساختار مورد انتظار را ندارد.');
  }
  return parsed;
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