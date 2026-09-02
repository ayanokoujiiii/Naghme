import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  MINI_PLAYER_CONTENT_PADDING,
  useMiniPlayerActive,
} from '@/hooks/useMiniPlayerActive';
import {
  askGeminiForRecommendation,
  getGeminiApiKey,
  getGeminiModel,
  GeminiRecommendation,
} from '@/src/ai/gemini';
import {
  createGeminiSummary,
  isKnownMood,
  selectLocalRecommendation,
} from '@/src/ai/recommendation';
import {
  getRecommendationTracks,
  RecommendationTrack,
} from '@/src/db/queries';

const moodOptions = [
  { value: 'آرام', icon: 'moon' as const },
  { value: 'غمگین', icon: 'cloud-rain' as const },
  { value: 'متفکر', icon: 'book-open' as const },
  { value: 'پرانرژی', icon: 'sun' as const },
];

type RecommendationResult = {
  track: RecommendationTrack;
  content: GeminiRecommendation;
  source: 'gemini' | 'local';
};

export default function RecommendationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const [selectedMood, setSelectedMood] = useState<string>('آرام');
  const [tracks, setTracks] = useState<RecommendationTrack[]>([]);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loadTracks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await getRecommendationTracks();
      setTracks(items);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن آرشیو انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTracks();
    }, [loadTracks]),
  );

  const generateRecommendation = async () => {
    if (generating || loading) return;
    if (!isKnownMood(selectedMood)) {
      setError('حال امشب را انتخاب کن.');
      return;
    }
    const local = selectLocalRecommendation(tracks, selectedMood);
    if (!local) {
      setError('برای پیشنهاد دادن، اول دست‌کم یک قطعه به آرشیو اضافه کن.');
      return;
    }

    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const apiKey = await getGeminiApiKey();
      if (apiKey) {
        try {
          const selectedModel = await getGeminiModel();
          const aiContent = await askGeminiForRecommendation(
            apiKey,
            createGeminiSummary(tracks),
            selectedMood,
            selectedModel,
          );
          setResult({ track: local.track, content: aiContent, source: 'gemini' });
          return;
        } catch (geminiError: unknown) {
          const message =
            geminiError instanceof Error ? geminiError.message : 'خطای ناشناخته در Gemini';
          console.error('[Gemini recommendation fallback]', geminiError);
          setNotice(`Gemini خطا داد: ${message} پیشنهاد محلی نغمه را برایت آماده کردم.`);
        }
      } else {
        setNotice('این پیشنهاد با توجه به تاریخچه‌ی شنیدن و حال‌های دفترچه ساخته شد.');
      }
      setResult({
        track: local.track,
        content: {
          title: local.title,
          recommendation: local.recommendation,
          culturalNote: local.culturalNote,
        },
        source: 'local',
      });
    } catch (recommendationError: unknown) {
      setError(
        recommendationError instanceof Error
          ? recommendationError.message
          : 'ساخت پیشنهاد انجام نشد.',
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 20,
          paddingBottom:
            insets.bottom +
            42 +
            (miniPlayerActive ? MINI_PLAYER_CONTENT_PADDING : 0),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          testID="recommendation-back"
          accessibilityRole="button"
          accessibilityLabel="بازگشت"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-right" size={21} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>همراه امشب تو</Text>
          <Text style={styles.title}>قطعه‌ای برای امشب</Text>
        </View>
        <View style={styles.headerIcon}>
          <Feather name="moon" size={21} color={colors.primary} />
        </View>
      </View>

      <View style={styles.introCard}>
        <View style={styles.introIcon}>
          <Feather name="star" size={21} color={colors.primary} />
        </View>
        <Text style={styles.introText}>
          حال امشبت را بگو تا از میان آرشیوت، قطعه‌ای را پیدا کنیم که کمی بیشتر شبیه همین لحظه است.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>امشب چه حالی داری؟</Text>
      <View style={styles.moodGrid}>
        {moodOptions.map((mood) => {
          const selected = selectedMood === mood.value;
          return (
            <Pressable
              key={mood.value}
              testID={`recommendation-mood-${mood.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setSelectedMood(mood.value)}
              style={({ pressed }) => [
                styles.moodOption,
                selected && styles.moodOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Feather
                name={mood.icon}
                size={17}
                color={selected ? colors.primaryForeground : colors.primary}
              />
              <Text style={[styles.moodText, selected && styles.moodTextSelected]}>
                {mood.value}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        testID="generate-recommendation"
        accessibilityRole="button"
        disabled={loading || generating}
        onPress={() => void generateRecommendation()}
        style={({ pressed }) => [
          styles.generateButton,
          (loading || generating) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {generating ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Feather name="heart" size={18} color={colors.primaryForeground} />
            <Text style={styles.generateButtonText}>برای من انتخاب کن</Text>
          </>
        )}
      </Pressable>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>در حال گوش دادن به آرشیوت…</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

      {result ? (
        <View style={styles.resultCard}>
          <View style={styles.resultTopRow}>
            <View style={styles.resultBadge}>
              <Feather
                name={result.source === 'gemini' ? 'zap' : 'compass'}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.resultBadgeText}>
                {result.source === 'gemini' ? 'روایت Gemini' : 'انتخاب نغمه'}
              </Text>
            </View>
            <Text style={styles.resultKicker}>پیشنهاد شخصی تو</Text>
          </View>
          <Text style={styles.resultTitle}>{result.content.title}</Text>
          <Text style={styles.resultCopy}>{result.content.recommendation}</Text>
          <View style={styles.culturalNote}>
            <Feather name="book-open" size={16} color={colors.primary} />
            <Text style={styles.culturalNoteText}>{result.content.culturalNote}</Text>
          </View>
          <Pressable
            testID="open-recommended-track"
            accessibilityRole="button"
            onPress={() => router.push(`/track/${result.track.id}`)}
            style={({ pressed }) => [styles.trackButton, pressed && styles.pressed]}
          >
            <Text style={styles.trackButtonText}>رفتن به صفحه‌ی قطعه</Text>
            <Feather name="arrow-left" size={17} color={colors.primaryForeground} />
          </Pressable>
        </View>
      ) : null}

      <Pressable
        testID="recommendation-open-settings"
        accessibilityRole="button"
        onPress={() => router.push('/settings')}
        style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}
      >
        <Feather name="settings" size={15} color={colors.mutedForeground} />
        <Text style={styles.settingsLinkText}>تنظیم کلید Gemini در تنظیمات</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 25 },
    backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    headerCopy: { flex: 1, alignItems: 'flex-end' },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right', marginBottom: 4 },
    title: { color: colors.foreground, fontSize: 28, lineHeight: 36, fontWeight: '700', textAlign: 'right' },
    headerIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    introCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, backgroundColor: colors.accent, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 28 },
    introIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    introText: { flex: 1, color: colors.accentForeground, fontSize: 13, lineHeight: 23, textAlign: 'right' },
    sectionTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', textAlign: 'right', marginBottom: 12 },
    moodGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9, marginBottom: 18 },
    moodOption: { width: '48%', minHeight: 49, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
    moodOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    moodText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
    moodTextSelected: { color: colors.primaryForeground },
    generateButton: { minHeight: 52, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: colors.primary, borderRadius: 16, marginBottom: 14 },
    generateButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '700' },
    disabled: { opacity: 0.6 },
    loading: { alignItems: 'center', gap: 8, paddingVertical: 20 },
    loadingText: { color: colors.mutedForeground, fontSize: 12 },
    errorText: { color: colors.destructive, fontSize: 12, lineHeight: 20, textAlign: 'right', marginBottom: 12 },
    noticeText: { color: colors.primary, fontSize: 12, lineHeight: 20, textAlign: 'right', marginBottom: 12 },
    resultCard: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 18, marginTop: 4 },
    resultTopRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    resultKicker: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right' },
    resultBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
    resultBadgeText: { color: colors.accentForeground, fontSize: 10, fontWeight: '700' },
    resultTitle: { color: colors.foreground, fontSize: 22, lineHeight: 30, fontWeight: '700', textAlign: 'right', marginTop: 16 },
    resultCopy: { color: colors.cardForeground, fontSize: 14, lineHeight: 24, textAlign: 'right', marginTop: 9 },
    culturalNote: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, backgroundColor: colors.secondary, borderRadius: 14, padding: 11, marginTop: 16 },
    culturalNoteText: { flex: 1, color: colors.mutedForeground, fontSize: 12, lineHeight: 21, textAlign: 'right' },
    trackButton: { minHeight: 46, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, marginTop: 17 },
    trackButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    settingsLink: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 18 },
    settingsLinkText: { color: colors.mutedForeground, fontSize: 12 },
    pressed: { opacity: 0.74 },
  });
}