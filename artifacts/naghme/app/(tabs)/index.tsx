import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  getFavoriteTracks,
  getLibraryStats,
  getRecentlyAddedTracks,
  HomeTrackRecord,
  LibraryStats,
} from '@/src/db/queries';
import { injectSampleData } from '@/src/db/seed';

const emptyStats: LibraryStats = { tracks: 0, albums: 0, artists: 0 };

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [stats, setStats] = useState<LibraryStats>(emptyStats);
  const [recentTracks, setRecentTracks] = useState<HomeTrackRecord[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<HomeTrackRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loadHome = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextStats, nextRecent, nextFavorites] = await Promise.all([
        getLibraryStats(),
        getRecentlyAddedTracks(),
        getFavoriteTracks(),
      ]);
      setStats(nextStats);
      setRecentTracks(nextRecent);
      setFavoriteTracks(nextFavorites);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن صفحه‌ی خانه انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome]),
  );

  const handleSeed = async () => {
    setSeeding(true);
    setError('');
    try {
      const result = await injectSampleData();
      await loadHome();
      Alert.alert(
        'داده‌ها آماده‌اند',
        `${result.artists} هنرمند، ${result.albums} آلبوم و ${result.tracks} قطعه به آرشیو اضافه شد.`,
      );
    } catch (seedError: unknown) {
      const message = seedError instanceof Error ? seedError.message : 'تزریق داده انجام نشد.';
      setError(message);
      Alert.alert('تزریق داده انجام نشد', message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 104 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.eyebrow}>آرشیو شخصی من</Text>
          <Text style={styles.title}>نغمه</Text>
        </View>
        <View style={styles.profileMark}>
          <Feather name="headphones" size={20} color={colors.primary} />
        </View>
      </View>

      <LinearGradient
        colors={[colors.accent, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />
        <Text style={styles.heroKicker}>صدای خاطره‌ها</Text>
        <Text style={styles.heroTitle}>موسیقی‌هایت را{'\n'}با حس خودت نگه دار</Text>
        <Text style={styles.heroCopy}>
          قطعه‌ها، هنرمندها و یادداشت‌های شنیداری‌ات؛ همه در یک جای آرام و شخصی.
        </Text>
        <Pressable
          testID="home-open-archive"
          onPress={() => router.push('/archive')}
          style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
        >
          <Text style={styles.heroButtonText}>رفتن به آرشیو</Text>
          <Feather name="arrow-left" size={18} color={colors.primaryForeground} />
        </Pressable>
      </LinearGradient>

      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>آرشیو تو</Text>
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.sectionHint}>زنده از SQLite</Text>}
      </View>
      <View style={styles.statsRow}>
        <StatCard icon="music" value={stats.tracks} label="قطعه" colors={colors} styles={styles} />
        <StatCard icon="disc" value={stats.albums} label="آلبوم" colors={colors} styles={styles} />
        <StatCard icon="mic" value={stats.artists} label="خواننده" colors={colors} styles={styles} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>اخیراً اضافه‌شده</Text>
        <Pressable onPress={() => router.push('/archive')} hitSlop={10}>
          <Text style={styles.sectionLink}>مشاهده‌ی همه</Text>
        </Pressable>
      </View>
      {recentTracks.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
          {recentTracks.map((track) => (
            <TrackTile key={track.id} track={track} colors={colors} styles={styles} />
          ))}
        </ScrollView>
      ) : (
        <EmptySection text="هنوز قطعه‌ای به آرشیو اضافه نشده است." colors={colors} styles={styles} />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>علاقه‌مندی‌ها</Text>
        <Feather name="heart" size={18} color={colors.destructive} />
      </View>
      {favoriteTracks.length > 0 ? (
        <View style={styles.favoriteList}>
          {favoriteTracks.map((track) => (
            <FavoriteRow key={track.id} track={track} colors={colors} styles={styles} />
          ))}
        </View>
      ) : (
        <EmptySection text="قطعه‌های محبوبت را با قلب‌زدن اینجا جمع کن." colors={colors} styles={styles} />
      )}

      <View style={styles.seedCard}>
        <View style={styles.seedIcon}>
          <Feather name="download-cloud" size={21} color={colors.primary} />
        </View>
        <View style={styles.seedCopy}>
          <Text style={styles.seedTitle}>آرشیو را با موسیقی ایرانی شروع کن</Text>
          <Text style={styles.seedDescription}>داده‌ی نمونه شامل شجریان، کلهر و علیزاده است.</Text>
        </View>
        <Pressable
          testID="inject-sample-data"
          accessibilityRole="button"
          disabled={seeding}
          onPress={() => void handleSeed()}
          style={({ pressed }) => [styles.seedButton, pressed && styles.pressed]}
        >
          {seeding ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.seedButtonText}>تزریق داده‌های آزمایشی</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatCard({
  icon,
  value,
  label,
  colors,
  styles,
}: {
  icon: 'music' | 'disc' | 'mic';
  value: number;
  label: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.statCard}>
      <Feather name={icon} size={17} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TrackTile({
  track,
  colors,
  styles,
}: {
  track: HomeTrackRecord;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      testID={`home-recent-${track.id}`}
      onPress={() => router.push(`/track/${track.id}`)}
      style={({ pressed }) => [styles.trackTile, pressed && styles.pressed]}
    >
      {track.coverImage ? (
        <Image source={{ uri: track.coverImage }} style={styles.trackCover} />
      ) : (
        <View style={styles.trackCoverFallback}>
          <Feather name="music" size={22} color={colors.primary} />
        </View>
      )}
      <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>
      <Text style={styles.trackAlbum} numberOfLines={1}>{track.albumTitle ?? 'بدون آلبوم'}</Text>
    </Pressable>
  );
}

function FavoriteRow({
  track,
  colors,
  styles,
}: {
  track: HomeTrackRecord;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      testID={`home-favorite-${track.id}`}
      onPress={() => router.push(`/track/${track.id}`)}
      style={({ pressed }) => [styles.favoriteRow, pressed && styles.pressed]}
    >
      <Feather name="heart" size={17} color={colors.destructive} />
      <View style={styles.favoriteCopy}>
        <Text style={styles.favoriteTitle}>{track.title}</Text>
        <Text style={styles.favoriteSubtitle}>{track.albumTitle ?? 'بدون آلبوم'}</Text>
      </View>
      <Feather name="chevron-left" size={19} color={colors.mutedForeground} />
    </Pressable>
  );
}

function EmptySection({
  text,
  colors,
  styles,
}: {
  text: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.emptySection}>
      <Feather name="music" size={17} color={colors.mutedForeground} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    topRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right', marginBottom: 5 },
    title: { color: colors.foreground, fontSize: 34, lineHeight: 42, fontWeight: '700', textAlign: 'right' },
    profileMark: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    hero: { minHeight: 300, borderRadius: 26, padding: 24, overflow: 'hidden', justifyContent: 'flex-end', position: 'relative' },
    heroOrbLarge: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: colors.primary, opacity: 0.12, top: -82, left: -42 },
    heroOrbSmall: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: colors.accentForeground, opacity: 0.55, top: 30, right: 32 },
    heroKicker: { color: colors.accentForeground, fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 9 },
    heroTitle: { color: colors.foreground, fontSize: 28, lineHeight: 38, fontWeight: '700', textAlign: 'right', marginBottom: 10 },
    heroCopy: { color: colors.mutedForeground, fontSize: 14, lineHeight: 24, textAlign: 'right', marginBottom: 20 },
    heroButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 9, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
    heroButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 14 },
    sectionTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700', textAlign: 'right' },
    sectionHint: { color: colors.mutedForeground, fontSize: 12 },
    sectionLink: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    statsRow: { flexDirection: 'row-reverse', gap: 10 },
    statCard: { flex: 1, minHeight: 102, borderRadius: 18, padding: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-end', justifyContent: 'space-between' },
    statValue: { color: colors.foreground, fontSize: 25, fontWeight: '700', lineHeight: 30 },
    statLabel: { color: colors.mutedForeground, fontSize: 12 },
    recentList: { gap: 12, paddingBottom: 2 },
    trackTile: { width: 142, padding: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    trackCover: { width: 120, height: 120, borderRadius: 13, backgroundColor: colors.accent },
    trackCoverFallback: { width: 120, height: 120, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    trackTitle: { color: colors.cardForeground, fontSize: 14, fontWeight: '700', lineHeight: 20, textAlign: 'right', marginTop: 10 },
    trackAlbum: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 4 },
    favoriteList: { gap: 9 },
    favoriteRow: { minHeight: 63, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 17 },
    favoriteCopy: { flex: 1 },
    favoriteTitle: { color: colors.cardForeground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    favoriteSubtitle: { color: colors.mutedForeground, fontSize: 12, textAlign: 'right', marginTop: 3 },
    emptySection: { minHeight: 70, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: 16 },
    emptyText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right' },
    errorBox: { marginTop: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: colors.muted, borderRadius: 14, padding: 12 },
    errorText: { flex: 1, color: colors.destructive, fontSize: 12, lineHeight: 20, textAlign: 'right' },
    seedCard: { marginTop: 28, padding: 14, borderRadius: 20, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 12 },
    seedIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    seedCopy: { alignItems: 'center' },
    seedTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    seedDescription: { color: colors.mutedForeground, fontSize: 12, textAlign: 'center', marginTop: 4 },
    seedButton: { minHeight: 42, width: '100%', borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
    seedButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    pressed: { opacity: 0.76 },
  });
}