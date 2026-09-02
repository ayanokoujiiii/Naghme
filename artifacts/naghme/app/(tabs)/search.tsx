import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { SearchResult, SearchResultType, searchLibrary } from '@/src/db/queries';

const labels: Record<SearchResultType, string> = {
  track: 'قطعه‌ها',
  album: 'آلبوم‌ها',
  artist: 'هنرمندان',
};

const icons: Record<SearchResultType, 'music' | 'disc' | 'mic'> = {
  track: 'music',
  album: 'disc',
  artist: 'mic',
};

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const runSearch = useCallback(async (value: string) => {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      setResults([]);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setResults(await searchLibrary(normalizedValue));
    } catch (searchError: unknown) {
      setError(searchError instanceof Error ? searchError.message : 'جست‌وجو انجام نشد.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (query.trim()) void runSearch(query);
    }, [query, runSearch]),
  );

  const groupedResults = useMemo(
    () =>
      (['track', 'album', 'artist'] as SearchResultType[]).map((type) => ({
        type,
        items: results.filter((result) => result.type === type),
      })),
    [results],
  );

  const navigateToResult = (result: SearchResult) => {
    if (result.type === 'track') router.push(`/track/${result.id}`);
    if (result.type === 'album') router.push(`/album/${result.id}`);
    if (result.type === 'artist') router.push(`/artist/${result.id}`);
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 96 },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>پیدا کردن یک خاطره</Text>
          <Text style={styles.title}>جست‌وجو</Text>
        </View>
        <View style={styles.headerIcon}>
          <Feather name="search" size={20} color={colors.primary} />
        </View>
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={20} color={colors.primary} />
        <TextInput
          testID="archive-search-input"
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            void runSearch(value);
          }}
          placeholder="نام قطعه، آلبوم یا هنرمند"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          textAlign="right"
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable
            testID="clear-search"
            accessibilityLabel="پاک کردن جست‌وجو"
            onPress={() => {
              setQuery('');
              setResults([]);
              setError('');
            }}
            hitSlop={10}
          >
            <Feather name="x-circle" size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.status}><ActivityIndicator color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : query.trim() && results.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={26} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>نتیجه‌ای پیدا نشد</Text>
          <Text style={styles.emptyCopy}>نام دیگری را امتحان کن یا داده‌های نمونه را از خانه تزریق کن.</Text>
        </View>
      ) : query.trim() ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.results}>
          {groupedResults.map((group) =>
            group.items.length > 0 ? (
              <View key={group.type} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{labels[group.type]}</Text>
                  <Text style={styles.groupCount}>{group.items.length}</Text>
                </View>
                <View style={styles.resultList}>
                  {group.items.map((result) => (
                    <Pressable
                      key={`${result.type}-${result.id}`}
                      testID={`search-result-${result.type}-${result.id}`}
                      accessibilityRole="button"
                      onPress={() => navigateToResult(result)}
                      style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
                    >
                      <View style={styles.resultIcon}>
                        <Feather name={icons[result.type]} size={18} color={colors.primary} />
                      </View>
                      <View style={styles.resultCopy}>
                        <Text style={styles.resultTitle}>{result.title}</Text>
                        {result.subtitle ? <Text style={styles.resultSubtitle}>{result.subtitle}</Text> : null}
                      </View>
                      <Feather name="chevron-left" size={19} color={colors.mutedForeground} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null,
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="layers" size={26} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>جست‌وجو آماده است</Text>
          <Text style={styles.emptyCopy}>نام یک قطعه، آلبوم یا هنرمند را بنویس تا نغمه در آرشیوت بگردد.</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right', marginBottom: 4 },
    title: { color: colors.foreground, fontSize: 34, lineHeight: 42, fontWeight: '700', textAlign: 'right' },
    headerIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    searchBox: { minHeight: 60, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, borderRadius: 18, paddingHorizontal: 16 },
    input: { flex: 1, color: colors.foreground, fontSize: 15, minHeight: 58 },
    status: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
    results: { paddingTop: 24, paddingBottom: 24, gap: 24 },
    group: { gap: 10 },
    groupHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    groupTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', textAlign: 'right' },
    groupCount: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    resultList: { gap: 8 },
    resultRow: { minHeight: 64, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
    resultIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    resultCopy: { flex: 1 },
    resultTitle: { color: colors.cardForeground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    resultSubtitle: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 3 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 80 },
    emptyTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 14, marginBottom: 8 },
    emptyCopy: { color: colors.mutedForeground, fontSize: 14, lineHeight: 24, textAlign: 'center' },
    errorBox: { marginTop: 18, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: colors.muted, borderRadius: 14, padding: 12 },
    errorText: { flex: 1, color: colors.destructive, fontSize: 13, lineHeight: 21, textAlign: 'right' },
    pressed: { opacity: 0.75 },
  });
}