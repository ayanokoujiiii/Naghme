import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CollectionPicker } from '@/components/CollectionPicker';
import {
  MINI_PLAYER_CONTENT_PADDING,
  useMiniPlayerActive,
} from '@/hooks/useMiniPlayerActive';
import {
  AlbumRecord,
  ArtistRecord,
  WorkRecord,
  getAlbums,
  getArtists,
  getTracks,
  getWorks,
  TrackRecord,
} from '@/src/db/queries';
import { playTracksInQueue } from '@/src/audio/audioManager';

type ArchiveView = 'tracks' | 'albums' | 'artists' | 'works';
type ArchiveRecord = TrackRecord | AlbumRecord | ArtistRecord | WorkRecord;

const viewLabels: Record<ArchiveView, string> = {
  tracks: 'قطعه‌ها',
  albums: 'آلبوم‌ها',
  artists: 'هنرمندان',
  works: 'آثار',
};

export default function ArchiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const [activeView, setActiveView] = useState<ArchiveView>('tracks');
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [albums, setAlbums] = useState<AlbumRecord[]>([]);
  const [artists, setArtists] = useState<ArtistRecord[]>([]);
  const [works, setWorks] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [pickerTrackId, setPickerTrackId] = useState<string | null>(null);

  const loadArchive = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [trackItems, albumItems, artistItems, workItems] = await Promise.all([
        getTracks(),
        getAlbums(),
        getArtists(),
        getWorks(),
      ]);
      setTracks(trackItems);
      setAlbums(albumItems);
      setArtists(artistItems);
      setWorks(workItems);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن آرشیو انجام نشد.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadArchive();
    }, [loadArchive]),
  );

  const navigateToAdd = () => {
    if (activeView === 'tracks') router.push('/add-track');
    if (activeView === 'albums') router.push('/add-album');
    if (activeView === 'artists') router.push('/add-artist');
    if (activeView === 'works') router.push('/add-work');
  };

  const albumById = useMemo(
    () => new Map(albums.map((album) => [album.id, album.title])),
    [albums],
  );

  const renderTrack = ({ item }: { item: TrackRecord }) => (
    <View style={styles.item}>
      <Pressable
        testID={`track-${item.id}`}
        accessibilityRole="button"
        onPress={() => router.push(`/track/${item.id}`)}
        style={({ pressed }) => [styles.itemMain, pressed && styles.itemPressed]}
      >
        <View style={styles.itemIcon}>
          {item.coverImage ? (
            <Image source={{ uri: item.coverImage }} style={styles.itemCover} resizeMode="cover" />
          ) : (
            <Feather name="music" size={19} color={colors.primary} />
          )}
        </View>
        <View style={styles.itemCopy}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemSubtitle}>
            {item.albumId && albumById.get(item.albumId)
              ? albumById.get(item.albumId)
              : 'بدون آلبوم'}
            {item.duration !== null ? `  •  ${formatDuration(item.duration)}` : ''}
          </Text>
        </View>
        <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
      </Pressable>
      {item.audioUri ? (
        <Pressable
          testID={`track-play-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`پخش ${item.title} و ادامه‌ی صف`}
          onPress={() => void playTracksInQueue(
            tracks.map((track) => ({
              ...track,
              artistName: artists.find((artist) => artist.id === track.artistId)?.name ?? null,
            })),
            tracks.findIndex((track) => track.id === item.id),
          )}
          style={({ pressed }) => [styles.itemPlayButton, pressed && styles.pressed]}
        >
          <Feather name="play" size={16} color={colors.primaryForeground} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`افزودن ${item.title} به مجموعه`}
        onPress={() => setPickerTrackId(item.id)}
        style={({ pressed }) => [styles.collectionAddButton, pressed && styles.pressed]}
      >
        <Feather name="plus" size={15} color={colors.primary} />
      </Pressable>
    </View>
  );

  const renderAlbum = ({ item }: { item: AlbumRecord }) => (
    <Pressable
      testID={`album-${item.id}`}
      accessibilityRole="button"
      onPress={() => router.push(`/album/${item.id}`)}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={[styles.itemIcon, { backgroundColor: colors.accent }]}>
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.itemCover} resizeMode="cover" />
        ) : (
          <Feather name="disc" size={19} color={colors.accentForeground} />
        )}
      </View>
      <View style={styles.itemCopy}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>
          {item.releaseYear ? `سال انتشار: ${item.releaseYear}` : 'سال انتشار ثبت نشده'}
        </Text>
      </View>
      <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
    </Pressable>
  );

  const renderArtist = ({ item }: { item: ArtistRecord }) => (
    <Pressable
      testID={`artist-${item.id}`}
      accessibilityRole="button"
      onPress={() => router.push(`/artist/${item.id}`)}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={[styles.itemIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="mic" size={19} color={colors.primary} />
      </View>
      <View style={styles.itemCopy}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemSubtitle}>
          {item.type || item.genres || 'هنرمند'}
        </Text>
      </View>
      <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
    </Pressable>
  );

  const renderWork = ({ item }: { item: WorkRecord }) => (
    <Pressable
      testID={`work-${item.id}`}
      accessibilityRole="button"
      onPress={() => router.push(`/work/${item.id}`)}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={[styles.itemIcon, { backgroundColor: colors.accent }]}>
        <Feather name="book-open" size={19} color={colors.accentForeground} />
      </View>
      <View style={styles.itemCopy}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>{item.genre || item.language || 'اثر موسیقایی'}</Text>
      </View>
      <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
    </Pressable>
  );

  const activeData: ArchiveRecord[] =
    activeView === 'tracks'
      ? tracks
      : activeView === 'albums'
        ? albums
        : activeView === 'artists'
          ? artists
          : works;
  const emptyTitle = {
    tracks: 'هنوز قطعه‌ای اضافه نکرده‌اید.',
    albums: 'هنوز آلبومی اضافه نکرده‌اید.',
    artists: 'هنوز هنرمندی اضافه نکرده‌اید.',
    works: 'هنوز اثری اضافه نکرده‌اید.',
  }[activeView];

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 84 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>مجموعه‌ی شخصی</Text>
          <Text style={styles.title}>آرشیو</Text>
        </View>
        <Pressable
          testID="archive-add"
          accessibilityLabel={`افزودن ${viewLabels[activeView]}`}
          onPress={navigateToAdd}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Feather name="plus" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <View style={styles.segmented}>
        {(Object.keys(viewLabels) as ArchiveView[]).map((view) => (
          <Pressable
            key={view}
            testID={`archive-tab-${view}`}
            onPress={() => setActiveView(view)}
            style={[styles.segment, activeView === view && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentText,
                activeView === view && styles.segmentTextActive,
              ]}
            >
              {viewLabels[view]}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={18} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (activeView === 'tracks') {
              return renderTrack({ item: item as TrackRecord });
            }
            if (activeView === 'albums') {
              return renderAlbum({ item: item as AlbumRecord });
            }
            if (activeView === 'artists') {
              return renderArtist({ item: item as ArtistRecord });
            }
            return renderWork({ item: item as WorkRecord });
          }}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                24 + (miniPlayerActive ? MINI_PLAYER_CONTENT_PADDING : 0),
            },
            activeData.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadArchive(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather
                  name={
                    activeView === 'tracks'
                      ? 'music'
                      : activeView === 'albums'
                        ? 'disc'
                        : activeView === 'artists'
                          ? 'mic'
                          : 'book-open'
                  }
                  size={30}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptyCopy}>
                اولین مورد را اضافه کن تا آرشیو شخصی‌ات شکل بگیرد.
              </Text>
              <Pressable
                testID={`empty-add-${activeView}`}
                onPress={navigateToAdd}
                style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
              >
                <Feather name="plus" size={17} color={colors.primaryForeground} />
                <Text style={styles.emptyButtonText}>افزودن</Text>
              </Pressable>
            </View>
          }
        />
      )}
      <CollectionPicker
        trackId={pickerTrackId}
        visible={pickerTrackId !== null}
        onClose={() => setPickerTrackId(null)}
      />
    </View>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 22,
    },
    headerCopy: { flex: 1 },
    eyebrow: {
      color: colors.mutedForeground,
      fontSize: 13,
      textAlign: 'right',
      marginBottom: 4,
    },
    title: {
      color: colors.foreground,
      fontSize: 34,
      lineHeight: 42,
      fontWeight: '700',
      textAlign: 'right',
    },
    addButton: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmented: {
      flexDirection: 'row-reverse',
      borderRadius: 16,
      backgroundColor: colors.card,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    segment: {
      flex: 1,
      minHeight: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: { backgroundColor: colors.accent },
    segmentText: {
      color: colors.mutedForeground,
      fontSize: 13,
      fontWeight: '600',
    },
    segmentTextActive: { color: colors.accentForeground },
    errorBox: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(217, 107, 95, 0.14)',
      borderRadius: 13,
      paddingHorizontal: 12,
      paddingVertical: 11,
      marginBottom: 12,
    },
    errorText: {
      flex: 1,
      color: colors.destructive,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'right',
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
    },
    listContent: { paddingBottom: 24 },
    emptyListContent: { flexGrow: 1 },
    item: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      minHeight: 92,
      elevation: 3,
    },
    itemMain: {
      flex: 1,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      minHeight: 62,
    },
    itemPlayButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginRight: 10,
    },
    collectionAddButton: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      marginRight: 7,
    },
    itemPressed: { opacity: 0.72 },
    itemIcon: {
      width: 64,
      height: 64,
      borderRadius: 17,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 14,
      overflow: 'hidden',
    },
    itemCover: { width: '100%', height: '100%' },
    itemCopy: { flex: 1 },
    itemTitle: {
      color: colors.cardForeground,
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'right',
      marginBottom: 5,
    },
    itemSubtitle: {
      color: colors.mutedForeground,
      fontSize: 12,
      textAlign: 'right',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 22,
      paddingBottom: 75,
    },
    emptyIcon: {
      width: 76,
      height: 76,
      borderRadius: 27,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    emptyTitle: {
      color: colors.foreground,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyCopy: {
      color: colors.mutedForeground,
      fontSize: 13,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 18,
    },
    emptyButton: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 11,
    },
    emptyButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '700',
    },
    pressed: { opacity: 0.72 },
  });
}