import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  MINI_PLAYER_CONTENT_PADDING,
  useMiniPlayerActive,
} from '@/hooks/useMiniPlayerActive';
import {
  getFavoriteTracks,
  getCollections,
  getLibraryStats,
  getRecentlyAddedTracks,
  getJournalEntriesPage,
  getListeningHistoryPage,
  HomeTrackRecord,
  CollectionRecord,
  JournalArchiveRecord,
  ListeningHistoryArchiveRecord,
  LibraryStats,
} from '@/src/db/queries';
import { playTracksInQueue } from '@/src/audio/audioManager';

const emptyStats: LibraryStats = { tracks: 0, albums: 0, artists: 0 };

export default function HomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const [stats, setStats] = useState<LibraryStats>(emptyStats);
  const [recentTracks, setRecentTracks] = useState<HomeTrackRecord[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<HomeTrackRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [latestJournal, setLatestJournal] = useState<JournalArchiveRecord | null>(null);
  const [latestListening, setLatestListening] = useState<ListeningHistoryArchiveRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadHome = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextStats, nextRecent, nextFavorites, nextCollections, nextJournal, nextListening] = await Promise.all([
        getLibraryStats(),
        getRecentlyAddedTracks(),
        getFavoriteTracks(),
        getCollections(4),
        getJournalEntriesPage({}, 1, 0),
        getListeningHistoryPage({}, 1, 0),
      ]);
      setStats(nextStats);
      setRecentTracks(nextRecent);
      setFavoriteTracks(nextFavorites);
      setCollections(nextCollections);
      setLatestJournal(nextJournal[0] ?? null);
      setLatestListening(nextListening[0] ?? null);
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

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          miniPlayerActive && { paddingBottom: 104 + MINI_PLAYER_CONTENT_PADDING },
        ]}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.topRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>آرشیو شخصی من</Text>
          <Text style={styles.title}>نغمه</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            testID="home-settings"
            accessibilityRole="button"
            accessibilityLabel="تنظیمات"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.profileMark, pressed && styles.pressed]}
          >
            <Feather name="settings" size={19} color={colors.primary} />
          </Pressable>
          <View style={styles.profileMark}>
            <Feather name="headphones" size={20} color={colors.primary} />
          </View>
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
        <Text style={styles.heroTitle}>بدون موسیقی، زندگی یک اشتباه خواهد بود</Text>
        <Text style={styles.heroAttribution}>فریدریش نیچه</Text>
        <Text style={styles.heroCopy}>
          قطعه‌ها، هنرمندها و یادداشت‌های شنیداری‌ات؛ همه در یک جای آرام و شخصی.
        </Text>
        <View style={styles.heroActions}>
          <Pressable
            testID="home-open-recommendation"
            onPress={() => router.push('/recommendation')}
            style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
          >
            <Text style={styles.heroButtonText}>قطعه‌ای برای امشب</Text>
            <Feather name="moon" size={17} color={colors.primaryForeground} />
          </Pressable>
          <Pressable
            testID="home-open-archive"
            onPress={() => router.push('/archive')}
            style={({ pressed }) => [styles.heroSecondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.heroSecondaryButtonText}>رفتن به آرشیو</Text>
            <Feather name="arrow-left" size={17} color={colors.primary} />
          </Pressable>
        </View>
      </LinearGradient>

      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>آرشیو تو</Text>
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.sectionHint}>نگاهی به آرشیوت</Text>}
      </View>
      <Pressable testID="home-open-postcards" onPress={() => router.push('/postcards')} style={({ pressed }) => [styles.postcardEntry, pressed && styles.pressed]}>
        <Feather name="image" size={17} color={colors.primary} />
        <Text style={styles.postcardEntryText}>آرشیو عکس‌نوشته‌ها</Text>
        <Text style={styles.postcardEntryLink}>نمایش</Text>
      </Pressable>
      <View style={styles.statsRow}>
        <StatCard icon="music" value={stats.tracks} label="قطعه" colors={colors} styles={styles} />
        <StatCard icon="disc" value={stats.albums} label="آلبوم" colors={colors} styles={styles} />
        <StatCard icon="mic" value={stats.artists} label="هنرمند" colors={colors} styles={styles} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>مجموعه‌ها</Text>
        <Pressable onPress={() => router.push('/collections')} hitSlop={10}>
          <Text style={styles.sectionLink}>{collections.length ? 'دیدن همه' : 'ساخت مجموعه'}</Text>
        </Pressable>
      </View>
      {collections.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionList}>
          {collections.map((collection) => (
            <Pressable
              key={collection.id}
              onPress={() => router.push(`/collection/${collection.id}`)}
              style={({ pressed }) => [styles.collectionTile, pressed && styles.pressed]}
            >
              <View style={styles.collectionTileCover}>
                {collection.coverImage ? (
                  <Image source={{ uri: collection.coverImage }} style={styles.collectionTileImage} />
                ) : (
                  <Feather name="layers" size={24} color={colors.primary} />
                )}
              </View>
              <Text style={styles.collectionTileTitle} numberOfLines={1}>{collection.title}</Text>
              <Text style={styles.collectionTileMeta}>{collection.trackCount} قطعه</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Pressable onPress={() => router.push('/collections')} style={({ pressed }) => [styles.emptySection, pressed && styles.pressed]}>
          <Feather name="layers" size={17} color={colors.primary} />
          <Text style={styles.emptyText}>برای حال‌وهوای خودت یک مجموعه بساز.</Text>
          <Feather name="plus" size={16} color={colors.primary} />
        </Pressable>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>دفترچه و تاریخچه</Text>
        <Text style={styles.sectionHint}>آخرین لحظه‌ها</Text>
      </View>
      <View style={styles.activityList}>
        <ActivityCard
          icon="book-open"
          title="آخرین یادداشت"
          primary={latestJournal?.note ?? 'هنوز یادداشتی ثبت نکرده‌ای.'}
          secondary={latestJournal ? `${latestJournal.trackTitle}  •  ${latestJournal.mood}` : 'حال خودت را کنار هر قطعه بنویس'}
          colors={colors}
          styles={styles}
          onPress={() => router.push('/journal')}
        />
        <ActivityCard
          icon="headphones"
          title="آخرین شنیده‌شده"
          primary={latestListening?.trackTitle ?? 'هنوز شنیدنی ثبت نشده است.'}
          secondary={latestListening ? (latestListening.artistName ?? 'هنرمند نامشخص') : 'با پخش یک قطعه، تاریخچه‌ات ساخته می‌شود'}
          colors={colors}
          styles={styles}
          onPress={() => router.push('/history')}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>اخیراً اضافه‌شده</Text>
        <Pressable onPress={() => router.push('/archive')} hitSlop={10}>
          <Text style={styles.sectionLink}>مشاهده‌ی همه</Text>
        </Pressable>
      </View>
      {recentTracks.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
          {recentTracks.map((track, index) => (
            <TrackTile
              key={track.id}
              track={track}
              colors={colors}
              styles={styles}
              onPress={() => void playTracksInQueue(recentTracks, index)}
            />
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
          {favoriteTracks.map((track, index) => (
            <FavoriteRow
              key={track.id}
              track={track}
              colors={colors}
              styles={styles}
              onPress={() => void playTracksInQueue(favoriteTracks, index)}
            />
          ))}
        </View>
      ) : (
        <EmptySection text="قطعه‌های محبوبت را با قلب‌زدن اینجا جمع کن." colors={colors} styles={styles} />
      )}

      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityCard({
  icon,
  title,
  primary,
  secondary,
  colors,
  styles,
  onPress,
}: {
  icon: 'book-open' | 'headphones';
  title: string;
  primary: string;
  secondary: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.activityCard, pressed && styles.pressed]}
    >
      <View style={styles.activityIcon}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.activityCopy}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityPrimary} numberOfLines={2}>{primary}</Text>
        <Text style={styles.activitySecondary} numberOfLines={1}>{secondary}</Text>
      </View>
      <Text style={styles.activityLink}>نمایش</Text>
    </Pressable>
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
  onPress,
}: {
  track: HomeTrackRecord;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`home-recent-${track.id}`}
      onPress={onPress}
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
  onPress,
}: {
  track: HomeTrackRecord;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`home-favorite-${track.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.favoriteRow, pressed && styles.pressed]}
    >
      <Feather name="heart" size={17} color={colors.destructive} />
      <View style={styles.favoriteCopy}>
         <Text style={styles.favoriteTitle} numberOfLines={2}>{track.title}</Text>
         <Text style={styles.favoriteSubtitle} numberOfLines={1}>{track.albumTitle ?? 'بدون آلبوم'}</Text>
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
     content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 104 },
    topRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
     headerCopy: { flex: 1, alignItems: 'flex-end', minWidth: 0 },
    headerActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right', marginBottom: 5 },
    title: { color: colors.foreground, fontSize: 34, lineHeight: 42, fontWeight: '700', textAlign: 'right' },
    profileMark: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    hero: { minHeight: 300, borderRadius: 26, padding: 24, overflow: 'hidden', justifyContent: 'flex-end', position: 'relative' },
    heroOrbLarge: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: colors.primary, opacity: 0.12, top: -82, left: -42 },
    heroOrbSmall: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: colors.accentForeground, opacity: 0.55, top: 30, right: 32 },
    heroKicker: { color: colors.accentForeground, fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 9 },
     heroTitle: { color: colors.foreground, fontSize: 28, lineHeight: 38, fontWeight: '700', textAlign: 'right', marginBottom: 6 },
     heroAttribution: { color: colors.mutedForeground, fontSize: 12, textAlign: 'right', marginBottom: 10 },
    heroCopy: { color: colors.mutedForeground, fontSize: 14, lineHeight: 24, textAlign: 'right', marginBottom: 20 },
    heroActions: { alignItems: 'flex-end', gap: 9 },
    heroButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 9, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
    heroButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '700' },
    heroSecondaryButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 14 },
    heroSecondaryButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 14 },
    sectionTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700', textAlign: 'right' },
    sectionHint: { color: colors.mutedForeground, fontSize: 12 },
    sectionLink: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    statsRow: { flexDirection: 'row-reverse', gap: 10 },
    statCard: { flex: 1, minHeight: 102, borderRadius: 18, padding: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-end', justifyContent: 'space-between' },
    statValue: { color: colors.foreground, fontSize: 25, fontWeight: '700', lineHeight: 30 },
    statLabel: { color: colors.mutedForeground, fontSize: 12 },
    recentList: { gap: 12, paddingBottom: 2 },
    collectionList: { gap: 10, paddingBottom: 2 },
    collectionTile: { width: 128, padding: 9, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    collectionTileCover: { width: 110, height: 92, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    collectionTileImage: { width: '100%', height: '100%' },
    collectionTileTitle: { color: colors.cardForeground, fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 8 },
    collectionTileMeta: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right', marginTop: 3 },
     trackTile: { width: 170, padding: 11, borderRadius: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, elevation: 3 },
     trackCover: { width: 148, height: 148, borderRadius: 16, backgroundColor: colors.accent },
     trackCoverFallback: { width: 148, height: 148, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    trackTitle: { color: colors.cardForeground, fontSize: 14, fontWeight: '700', lineHeight: 20, textAlign: 'right', marginTop: 10 },
    trackAlbum: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 4 },
    favoriteList: { gap: 9 },
    favoriteRow: { minHeight: 63, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 17 },
     favoriteCopy: { flex: 1, minWidth: 0 },
    favoriteTitle: { color: colors.cardForeground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    favoriteSubtitle: { color: colors.mutedForeground, fontSize: 12, textAlign: 'right', marginTop: 3 },
     activityList: { gap: 9 },
     activityCard: { minHeight: 82, padding: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
     activityIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
     activityCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
     activityTitle: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right' },
     activityPrimary: { color: colors.cardForeground, fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 4 },
     activitySecondary: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right', marginTop: 3 },
     activityLink: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    emptySection: { minHeight: 70, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: 16 },
    postcardEntry: { minHeight: 70, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 16, marginBottom: 16 },
     postcardEntryText: { flex: 1, color: colors.foreground, fontSize: 13, textAlign: 'right' },
     postcardEntryLink: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    emptyText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right' },
    errorBox: { marginTop: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: colors.muted, borderRadius: 14, padding: 12 },
    errorText: { flex: 1, color: colors.destructive, fontSize: 12, lineHeight: 20, textAlign: 'right' },
    pressed: { opacity: 0.76 },
  });
}