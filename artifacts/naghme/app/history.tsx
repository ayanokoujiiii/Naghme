import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { MINI_PLAYER_CONTENT_PADDING, useMiniPlayerActive } from '@/hooks/useMiniPlayerActive';
import {
  ArchiveDateRange,
  deleteListeningHistory,
  deleteListeningHistoryEntry,
  getListeningHistoryOverview,
  getListeningHistoryPage,
  ListeningHistoryArchiveRecord,
  ListeningHistoryFilters,
  ListeningHistoryOverview,
} from '@/src/db/queries';
import { playTracksInQueue } from '@/src/audio/audioManager';

const PAGE_SIZE = 30;
const dateOptions: Array<{ value: ArchiveDateRange; label: string }> = [
  { value: 'all', label: 'همه' },
  { value: 'week', label: 'هفت روز اخیر' },
  { value: 'month', label: 'ماه اخیر' },
  { value: 'year', label: 'سال اخیر' },
];
const emptyOverview: ListeningHistoryOverview = { total: 0, topTracks: [], topArtists: [] };

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function HistoryScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const params = useLocalSearchParams<{ artistId?: string | string[]; trackId?: string | string[] }>();
  const routeArtistId = firstParam(params.artistId) ?? null;
  const routeTrackId = firstParam(params.trackId) ?? null;
  const [dateRange, setDateRange] = useState<ArchiveDateRange>('all');
  const [rows, setRows] = useState<ListeningHistoryArchiveRecord[]>([]);
  const [overview, setOverview] = useState<ListeningHistoryOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const filters = useMemo<ListeningHistoryFilters>(
    () => ({ dateRange, artistId: routeArtistId, trackId: routeTrackId }),
    [dateRange, routeArtistId, routeTrackId],
  );

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextRows, nextOverview] = await Promise.all([
        getListeningHistoryPage(filters, PAGE_SIZE, 0),
        getListeningHistoryOverview(filters),
      ]);
      setRows(nextRows);
      setOverview(nextOverview);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن تاریخچه انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  const loadMore = async () => {
    if (loading || loadingMore || rows.length >= overview.total) return;
    setLoadingMore(true);
    try {
      const nextRows = await getListeningHistoryPage(filters, PAGE_SIZE, rows.length);
      setRows((current) => [...current, ...nextRows]);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'ادامه‌ی تاریخچه خوانده نشد.');
    } finally {
      setLoadingMore(false);
    }
  };

  const confirmDelete = (row: ListeningHistoryArchiveRecord) => {
    Alert.alert(
      'حذف از تاریخچه',
      `این شنیدنِ «${row.trackTitle}» از تاریخچه حذف شود؟`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void deleteListeningHistoryEntry(row.id)
              .then(() => loadFirstPage())
              .catch((deleteError: unknown) =>
                setError(deleteError instanceof Error ? deleteError.message : 'حذف از تاریخچه انجام نشد.'),
              );
          },
        },
      ],
    );
  };

  const confirmClear = () => {
    const scope = dateRange === 'all' ? 'همه‌ی تاریخچه' : `تاریخچه‌ی ${dateOptions.find((item) => item.value === dateRange)?.label}`;
    Alert.alert(
      `پاک‌کردن ${scope}`,
      'این کار برگشت‌پذیر نیست و شنیدن‌های انتخاب‌شده برای همیشه حذف می‌شوند.',
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'پاک‌کردن برای همیشه',
          style: 'destructive',
          onPress: () => {
            void deleteListeningHistory(filters)
              .then(() => loadFirstPage())
              .catch((deleteError: unknown) =>
                setError(deleteError instanceof Error ? deleteError.message : 'پاک‌کردن تاریخچه انجام نشد.'),
              );
          },
        },
      ],
    );
  };

  const queue = Array.from(
    new Map(rows.map((row) => [
      row.trackId,
      {
        id: row.trackId,
        title: row.trackTitle,
        audioUri: row.audioUri,
        coverImage: row.coverImage,
        versionName: row.versionName,
        artistName: row.artistName,
        lyrics: row.lyrics,
        duration: row.duration,
      },
    ])).values(),
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item, index }) => (
          <View>
            {index === 0 || dayKey(rows[index - 1]?.listenedAt) !== dayKey(item.listenedAt) ? (
              <Text style={styles.dayHeading}>{formatDay(item.listenedAt)}</Text>
            ) : null}
            <HistoryRow
              row={item}
              colors={colors}
              styles={styles}
              onOpen={() => router.push(`/track/${item.trackId}`)}
              onPlay={() => void playTracksInQueue(queue, Math.max(0, queue.findIndex((track) => track.id === item.trackId)))}
              onDelete={() => confirmDelete(item)}
            />
          </View>
        )}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          miniPlayerActive && { paddingBottom: 104 + MINI_PLAYER_CONTENT_PADDING },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Pressable
                testID="history-back"
                accessibilityRole="button"
                accessibilityLabel="بازگشت"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <Feather name="arrow-right" size={21} color={colors.foreground} />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>ردپای شنیدن‌های تو</Text>
                <Text style={styles.title}>تاریخچه‌ی شنیدن</Text>
                <Text style={styles.subtitle}>{routeArtistId ? 'فیلترشده بر اساس هنرمند' : routeTrackId ? 'فیلترشده بر اساس قطعه' : 'هر بار که موسیقی دوباره زنده شد'}</Text>
              </View>
              <View style={styles.headerIcon}><Feather name="headphones" size={23} color={colors.primary} /></View>
            </View>

            <View style={styles.filterCard}>
              <View style={styles.filterHeading}>
                <Text style={styles.filterTitle}>بازه‌ی زمانی</Text>
                <Text style={styles.resultCount}>{overview.total} بار شنیدن</Text>
              </View>
              <View style={styles.chips}>
                {dateOptions.map((option) => {
                  const active = dateRange === option.value;
                  return (
                    <Pressable key={option.value} onPress={() => setDateRange(option.value)} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {overview.total > 0 ? (
                <Pressable testID="history-clear" onPress={confirmClear} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                  <Feather name="trash-2" size={15} color={colors.destructive} />
                  <Text style={styles.clearText}>پاک‌کردن این بازه</Text>
                </Pressable>
              ) : null}
            </View>

            {overview.total > 0 ? (
              <HistoryStats overview={overview} colors={colors} styles={styles} />
            ) : null}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>شنیده‌شده‌ها</Text>
              {overview.total > rows.length ? <Text style={styles.sectionHint}>برای دیدن موارد بیشتر پایین برو</Text> : null}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyBox}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}><Feather name="headphones" size={24} color={colors.primary} /></View>
              <Text style={styles.emptyTitle}>هنوز شنیدنی ثبت نشده است</Text>
              <Text style={styles.emptyText}>وقتی قطعه‌ای را پخش کنی، مسیر شنیدن‌هایت اینجا می‌ماند.</Text>
            </View>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.footerLoader} /> : null}
      />
      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={16} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function HistoryStats({
  overview,
  colors,
  styles,
}: {
  overview: ListeningHistoryOverview;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.statsCard}>
      <View style={styles.statHero}>
        <Feather name="bar-chart-2" size={18} color={colors.primary} />
        <View style={styles.statHeroCopy}>
          <Text style={styles.statHeroValue}>{overview.total}</Text>
          <Text style={styles.statHeroLabel}>بار شنیدن در این بازه</Text>
        </View>
      </View>
      <View style={styles.topColumns}>
        <View style={styles.topColumn}>
          <Text style={styles.topTitle}>هنرمندهای پرشنیده</Text>
          {overview.topArtists.length ? overview.topArtists.slice(0, 3).map((artist, index) => (
            <View key={artist.artistId} style={styles.topRow}>
              <Text style={styles.topCount}>{artist.listeningCount}</Text>
              <Text style={styles.topName} numberOfLines={1}>{index + 1}. {artist.name}</Text>
            </View>
          )) : <Text style={styles.mutedText}>هنرمندی ثبت نشده</Text>}
        </View>
        <View style={styles.topColumn}>
          <Text style={styles.topTitle}>قطعه‌های پرشنیده</Text>
          {overview.topTracks.length ? overview.topTracks.slice(0, 3).map((track, index) => (
            <View key={track.trackId} style={styles.topRow}>
              <Text style={styles.topCount}>{track.listeningCount}</Text>
              <Text style={styles.topName} numberOfLines={1}>{index + 1}. {track.title}</Text>
            </View>
          )) : <Text style={styles.mutedText}>قطعه‌ای ثبت نشده</Text>}
        </View>
      </View>
    </View>
  );
}

function HistoryRow({
  row,
  colors,
  styles,
  onOpen,
  onPlay,
  onDelete,
}: {
  row: ListeningHistoryArchiveRecord;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onOpen: () => void;
  onPlay: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.historyCard}>
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.historyMain, pressed && styles.pressed]}>
        {row.coverImage ? <Image source={{ uri: row.coverImage }} style={styles.cover} /> : <View style={[styles.cover, styles.coverFallback]}><Feather name="music" size={19} color={colors.primary} /></View>}
        <View style={styles.historyCopy}>
          <Text style={styles.trackText} numberOfLines={1}>{row.trackTitle}</Text>
          <Text style={styles.artistText} numberOfLines={1}>{row.artistName ?? 'هنرمند نامشخص'}</Text>
          <Text style={styles.listenMeta}>
            {formatDuration(row.durationSeconds)}  •  {formatCompletion(row.completionPercent)}
          </Text>
        </View>
        <Text style={styles.timeText}>{formatTime(row.listenedAt)}</Text>
      </Pressable>
      <View style={styles.rowActions}>
        {row.audioUri ? (
          <Pressable testID={`history-play-${row.id}`} accessibilityRole="button" accessibilityLabel={`پخش ${row.trackTitle}`} onPress={onPlay} style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}>
            <Feather name="play" size={15} color={colors.primaryForeground} />
          </Pressable>
        ) : null}
        <Pressable testID={`history-delete-${row.id}`} accessibilityRole="button" accessibilityLabel="حذف از تاریخچه" onPress={onDelete} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Feather name="trash-2" size={15} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

function dateFor(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDay(value: string): string {
  const date = dateFor(value);
  if (!date) return 'روز نامشخص';
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const difference = Math.round((start - day) / 86400000);
  if (difference === 0) return 'امروز';
  if (difference === 1) return 'دیروز';
  try {
    return date.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'short' });
  } catch {
    return date.toLocaleDateString();
  }
}

function dayKey(value: string): string {
  const date = dateFor(value);
  return date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : 'unknown';
}

function formatTime(value: string): string {
  const date = dateFor(value);
  if (!date) return '--:--';
  try {
    return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingTop: (Platform.OS === 'web' ? 67 : 0) + 16, paddingBottom: 34, flexGrow: 1 },
    header: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: 22 },
    backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    headerCopy: { flex: 1, paddingHorizontal: 3 },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right', marginBottom: 5 },
    title: { color: colors.foreground, fontSize: 28, lineHeight: 36, fontWeight: '700', textAlign: 'right' },
    subtitle: { color: colors.primary, fontSize: 12, textAlign: 'right', marginTop: 6 },
    headerIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    filterCard: { padding: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
    filterHeading: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
    filterTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    resultCount: { color: colors.mutedForeground, fontSize: 11 },
    chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 },
    chip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 11, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.foreground, fontSize: 11, fontWeight: '600' },
    chipTextActive: { color: colors.primaryForeground },
    clearButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 13, paddingVertical: 4 },
    clearText: { color: colors.destructive, fontSize: 11, fontWeight: '700' },
    statsCard: { padding: 14, borderRadius: 20, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border, marginBottom: 19 },
    statHero: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    statHeroCopy: { alignItems: 'flex-end' },
    statHeroValue: { color: colors.foreground, fontSize: 25, lineHeight: 29, fontWeight: '700' },
    statHeroLabel: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
    topColumns: { flexDirection: 'row-reverse', gap: 13, marginTop: 12 },
    topColumn: { flex: 1, minWidth: 0 },
    topTitle: { color: colors.foreground, fontSize: 11, fontWeight: '700', textAlign: 'right', marginBottom: 7 },
    topRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginBottom: 5 },
    topName: { flex: 1, color: colors.mutedForeground, fontSize: 10, textAlign: 'right' },
    topCount: { color: colors.primary, fontSize: 10, fontWeight: '700' },
    mutedText: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right' },
    sectionHeading: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
    sectionTitle: { color: colors.foreground, fontSize: 19, fontWeight: '700', textAlign: 'right' },
    sectionHint: { color: colors.mutedForeground, fontSize: 10 },
    historyCard: { padding: 11, borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 9 },
    historyMain: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    cover: { width: 57, height: 57, borderRadius: 14, backgroundColor: colors.accent },
    coverFallback: { alignItems: 'center', justifyContent: 'center' },
    historyCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    dayHeading: { color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'right', marginTop: 7, marginBottom: 7 },
    trackText: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 5 },
    artistText: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 3 },
    listenMeta: { color: colors.primary, fontSize: 10, textAlign: 'right', marginTop: 4 },
    timeText: { color: colors.mutedForeground, fontSize: 11, alignSelf: 'flex-start', marginTop: 2 },
    rowActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 7 },
    playButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    iconButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
    emptyBox: { minHeight: 230, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, padding: 24 },
    emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    emptyText: { color: colors.mutedForeground, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 7 },
    footerLoader: { marginVertical: 18 },
    errorBox: { position: 'absolute', left: 20, right: 20, bottom: 18, flexDirection: 'row-reverse', gap: 8, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.destructive },
    errorText: { flex: 1, color: colors.destructive, fontSize: 12, lineHeight: 19, textAlign: 'right' },
    pressed: { opacity: 0.76 },
  });
}

function formatDuration(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'مدت قدیمی';
  const seconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')} دقیقه`;
}

function formatCompletion(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'کامل';
  return `${Math.round(Math.max(0, Math.min(100, value)))}٪ تکمیل`;
}