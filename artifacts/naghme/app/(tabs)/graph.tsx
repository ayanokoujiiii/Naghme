import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  AlbumRecord,
  ArtistRecord,
  getAlbums,
  getArtists,
  getMusicGraphRows,
  MusicGraphRow,
  TrackRecord,
} from '@/src/db/queries';
import { SAMPLE_ARTIST_ALBUM_LINKS } from '@/src/db/seed';
import { loadAudio, playAudio } from '@/src/audio/audioManager';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/src/player/coverColors';

type ExpandedState = Record<string, boolean>;
type GraphAlbum = AlbumRecord & { tracks: TrackRecord[]; artistName?: string | null };
type GraphArtist = ArtistRecord & { albums: GraphAlbum[] };

export default function GraphScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const [artists, setArtists] = useState<GraphArtist[]>([]);
  const [unassignedAlbums, setUnassignedAlbums] = useState<GraphAlbum[]>([]);
  const [unassignedTracks, setUnassignedTracks] = useState<TrackRecord[]>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [artistItems, albumItems, graphRows] = await Promise.all([
        getArtists(),
        getAlbums(),
        getMusicGraphRows(),
      ]);
      const albumById = new Map(albumItems.map((album) => [album.id, album]));
      const tracksByAlbum = new Map<string, TrackRecord[]>();
      const artistAlbumIds = new Map<string, Set<string>>();
      const tracksById = new Map<string, TrackRecord>();
      SAMPLE_ARTIST_ALBUM_LINKS.forEach((link) => {
        const albumIds = artistAlbumIds.get(link.artistId) ?? new Set<string>();
        albumIds.add(link.albumId);
        artistAlbumIds.set(link.artistId, albumIds);
      });
      graphRows.forEach((row) => {
        const track = mapGraphTrack(row);
        tracksById.set(track.id, track);
        if (track.albumId) {
          const existing = tracksByAlbum.get(track.albumId) ?? [];
          existing.push(track);
          tracksByAlbum.set(track.albumId, existing);
        }
        if (row.artistId && row.albumId) {
          const albumIds = artistAlbumIds.get(row.artistId) ?? new Set<string>();
          albumIds.add(row.albumId);
          artistAlbumIds.set(row.artistId, albumIds);
        }
      });
      const linkedAlbumIds = new Set<string>();
      const nextArtists = artistItems.map((artist) => {
        const linkedAlbums = Array.from(artistAlbumIds.get(artist.id) ?? [])
          .map((albumId) => albumById.get(albumId))
          .filter((album): album is AlbumRecord => Boolean(album))
          .map((album) => {
            linkedAlbumIds.add(album.id);
            return {
              ...album,
              artistName: artist.name,
              tracks: tracksByAlbum.get(album.id) ?? [],
            };
          });
        return { ...artist, albums: linkedAlbums };
      });
      const nextUnassignedAlbums = albumItems
        .filter((album) => !linkedAlbumIds.has(album.id))
        .map((album) => ({ ...album, tracks: tracksByAlbum.get(album.id) ?? [] }));
      const nextExpanded: ExpandedState = {};
      nextArtists.forEach((artist) => {
        nextExpanded[`artist:${artist.id}`] = true;
        artist.albums.forEach((album) => {
          nextExpanded[`album:${album.id}`] = true;
        });
      });
      nextUnassignedAlbums.forEach((album) => {
        nextExpanded[`album:${album.id}`] = true;
      });
      setArtists(nextArtists);
      setUnassignedAlbums(nextUnassignedAlbums);
      setUnassignedTracks(Array.from(tracksById.values()).filter((track) => !track.albumId));
      setExpanded(nextExpanded);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن نقشه انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGraph();
    }, [loadGraph]),
  );

  const toggle = (key: string) => {
    setExpanded((current) => ({ ...current, [key]: !current[key] }));
  };

  const showToast = (message: string) => {
    setToastMessage('');
    requestAnimationFrame(() => setToastMessage(message));
  };

  const playGraphTrack = async (track: TrackRecord, artistName: string | null = null) => {
    showToast('در حال پخش...');
    if (!track.audioUri) {
      showToast('فایل صوتی این قطعه موجود نیست.');
      return;
    }
    try {
      await loadAudio(track.audioUri, track.id, {
        title: track.title,
        coverImage: track.coverImage,
        versionName: track.versionName,
        artistName,
        lyrics: track.lyrics,
        durationSeconds: track.duration,
      });
      const started = await playAudio();
      if (!started) showToast('فایل صوتی آماده‌ی پخش نیست.');
    } catch {
      showToast('بارگذاری فایل صوتی این قطعه ممکن نیست.');
    }
  };

  const playAlbum = async (album: GraphAlbum) => {
    const firstPlayableTrack = album.tracks.find((track) => Boolean(track.audioUri));
    if (!firstPlayableTrack) {
      showToast('هیچ قطعه‌ی قابل پخشی در این آلبوم نیست.');
      return;
    }
    await playGraphTrack(firstPlayableTrack, album.artistName ?? null);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          miniPlayerActive && { paddingBottom: 104 + MINI_PLAYER_CONTENT_PADDING },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Feather name="git-branch" size={21} color={colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ارتباط‌های آرشیو</Text>
            <Text style={styles.title}>نقشه‌ی موسیقی</Text>
          </View>
        </View>
        <Text style={styles.intro}>
          از هنرمند شروع کن و مسیر آلبوم تا قطعه را دنبال کن. برای دیدن جزئیات روی هر گره بزن.
        </Text>

        {loading ? (
          <View style={styles.status}><ActivityIndicator color={colors.primary} /></View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={17} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : artists.length === 0 && unassignedAlbums.length === 0 && unassignedTracks.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="git-branch" size={26} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>نقشه هنوز خالی است</Text>
            <Text style={styles.emptyText}>از صفحه‌ی خانه داده‌های آزمایشی را تزریق کن.</Text>
          </View>
        ) : (
          <View style={styles.tree}>
            {artists.map((artist) => (
              <View key={artist.id} style={styles.artistBranch}>
                <ArtistNode
                  artist={artist}
                  caption={artist.albums.length ? `${artist.albums.length} آلبوم` : 'بدون آلبوم ثبت‌شده'}
                  colors={colors}
                  styles={styles}
                  onPress={() => router.push(`/artist/${artist.id}`)}
                  onToggle={artist.albums.length ? () => toggle(`artist:${artist.id}`) : undefined}
                  expanded={expanded[`artist:${artist.id}`]}
                />
                {expanded[`artist:${artist.id}`] ? (
                  <View style={styles.children}>
                    {artist.albums.map((album) => (
                      <AlbumBranch
                        key={album.id}
                        album={album}
                        expanded={expanded[`album:${album.id}`]}
                        onPress={() => router.push(`/album/${album.id}`)}
                        onToggle={() => toggle(`album:${album.id}`)}
                        onLongPress={() => void playAlbum(album)}
                        onTrackLongPress={(track) => void playGraphTrack(track, artist.name)}
                        colors={colors}
                        styles={styles}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
            {unassignedAlbums.length > 0 ? (
              <View style={styles.unassignedBranch}>
                <Text style={styles.groupLabel}>آلبوم‌های بدون هنرمند</Text>
                {unassignedAlbums.map((album) => (
                  <AlbumBranch
                    key={album.id}
                    album={album}
                    expanded={expanded[`album:${album.id}`]}
                    onPress={() => router.push(`/album/${album.id}`)}
                    onToggle={() => toggle(`album:${album.id}`)}
                    onLongPress={() => void playAlbum(album)}
                    onTrackLongPress={(track) => void playGraphTrack(track)}
                    colors={colors}
                    styles={styles}
                  />
                ))}
              </View>
            ) : null}
            {unassignedTracks.length > 0 ? (
              <View style={styles.unassignedBranch}>
                <Text style={styles.groupLabel}>قطعه‌های بدون آلبوم</Text>
                {unassignedTracks.map((track) => (
                  <Pressable
                    key={track.id}
                    accessibilityRole="button"
                    accessibilityLabel={`پخش ${track.title}`}
                    onPress={() => router.push(`/track/${track.id}`)}
                    onLongPress={() => void playGraphTrack(track)}
                    style={({ pressed }) => [styles.trackNode, pressed && styles.pressed]}
                  >
                    <Feather name="music" size={17} color={colors.primary} />
                    <Text style={styles.nodeTitle} numberOfLines={2}>{track.title}</Text>
                    <Feather name="chevron-left" size={17} color={colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
      <GraphToast message={toastMessage} colors={colors} styles={styles} />
    </SafeAreaView>
  );
}

function mapGraphTrack(row: MusicGraphRow): TrackRecord {
  return {
    id: row.trackId,
    title: row.trackTitle,
    duration: row.trackDuration,
    artistId: row.trackArtistId,
    albumId: row.trackAlbumId,
    audioUri: row.trackAudioUri,
    coverImage: row.trackCoverImage,
    lyrics: row.trackLyrics,
    sheetMusicUri: row.trackSheetMusicUri,
    versionName: row.trackVersionName,
    workId: row.trackWorkId,
    versionId: row.trackVersionId,
  };
}

function ArtistNode({
  artist,
  caption,
  expanded,
  onToggle,
  onPress,
  colors,
  styles,
}: {
  artist: GraphArtist;
  caption: string;
  expanded?: boolean;
  onToggle?: () => void;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.artistNodeRow}>
      {onToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'بستن شاخه‌ی هنرمند' : 'باز کردن شاخه‌ی هنرمند'}
          onPress={onToggle}
          hitSlop={8}
          style={styles.artistToggle}
        >
          <Feather
            name={expanded ? 'chevron-down' : 'chevron-left'}
            size={18}
            color={colors.mutedForeground}
          />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`هنرمند ${artist.name}`}
        onPress={onPress}
        style={({ pressed }) => [styles.artistNodeContent, pressed && styles.pressed]}
      >
      <View style={styles.artistAvatarGlow}>
        {artist.profileImage || artist.image ? (
          <Image
            source={{ uri: artist.profileImage ?? artist.image ?? undefined }}
            style={styles.artistAvatar}
          />
        ) : (
          <View style={styles.artistAvatarFallback}>
            <Feather name="mic" size={22} color={colors.primary} />
          </View>
        )}
      </View>
      <View style={styles.artistNodeCopy}>
        <Text style={styles.artistNodeTitle} numberOfLines={2}>{artist.name}</Text>
        <Text style={styles.nodeCaption}>{caption}</Text>
      </View>
      <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function GraphToast({
  message,
  colors,
  styles,
}: {
  message: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!message) return;
    progress.value = withSequence(
      withTiming(1, { duration: 220 }),
      withDelay(2300, withTiming(0, { duration: 260 })),
    );
  }, [message, progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 20 }],
  }));
  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, animatedStyle]}>
      <Feather name="play-circle" size={17} color={colors.primary} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

function NodeHeader({
  icon,
  imageUri,
  label,
  caption,
  expanded,
  onPress,
  onToggle,
  onLongPress,
  colors,
  styles,
}: {
  icon: 'mic' | 'disc';
  imageUri?: string | null;
  label: string;
  caption: string;
  expanded?: boolean;
  onPress: () => void;
  onToggle?: () => void;
  onLongPress?: () => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.nodeHeader}>
      {onToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'بستن شاخه' : 'باز کردن شاخه'}
          onPress={onToggle}
          hitSlop={8}
          style={styles.toggle}
        >
          <Feather name={expanded ? 'chevron-down' : 'chevron-left'} size={18} color={colors.mutedForeground} />
        </Pressable>
      ) : <View style={styles.toggle} />}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.nodeButton, pressed && styles.pressed]}
      >
        {imageUri ? (
          <Image
            testID={`graph-node-cover-${label}`}
            source={{ uri: imageUri }}
            style={styles.nodeArtwork}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.nodeIcon}><Feather name={icon} size={18} color={colors.primary} /></View>
        )}
        <View style={styles.nodeCopy}>
          <Text style={styles.nodeTitle} numberOfLines={2}>{label}</Text>
          <Text style={styles.nodeCaption}>{caption}</Text>
        </View>
        <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function AlbumBranch({
  album,
  expanded,
  onPress,
  onToggle,
  onLongPress,
  onTrackLongPress,
  colors,
  styles,
}: {
  album: GraphAlbum;
  expanded?: boolean;
  onPress: () => void;
  onToggle: () => void;
  onLongPress: () => void;
  onTrackLongPress: (track: TrackRecord) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.albumBranch}>
      <NodeHeader
        icon="disc"
        imageUri={album.coverImage}
        label={album.title}
        caption={album.tracks.length ? `${album.tracks.length} قطعه` : 'بدون قطعه'}
        expanded={expanded}
        onPress={onPress}
        onToggle={album.tracks.length ? onToggle : undefined}
        onLongPress={onLongPress}
        colors={colors}
        styles={styles}
      />
      {expanded ? (
        <View style={styles.trackChildren}>
          {album.tracks.map((track) => (
            <Pressable
              key={track.id}
              onPress={() => router.push(`/track/${track.id}`)}
              onLongPress={() => onTrackLongPress(track)}
              style={({ pressed }) => [styles.trackNode, pressed && styles.pressed]}
            >
              <Feather name="music" size={16} color={colors.accentForeground} />
              <Text style={styles.nodeTitle} numberOfLines={2}>{track.title}</Text>
              <Feather name="arrow-left" size={15} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 104 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13, marginBottom: 16 },
    headerIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    headerCopy: { flex: 1 },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, textAlign: 'right', marginBottom: 4 },
    title: { color: colors.foreground, fontSize: 30, lineHeight: 38, fontWeight: '700', textAlign: 'right' },
    intro: { color: colors.mutedForeground, fontSize: 13, lineHeight: 23, textAlign: 'right', marginBottom: 24 },
    status: { minHeight: 300, alignItems: 'center', justifyContent: 'center' },
    errorBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: colors.muted, borderRadius: 14, padding: 12 },
    errorText: { flex: 1, color: colors.destructive, fontSize: 13, lineHeight: 21, textAlign: 'right' },
    emptyState: { minHeight: 300, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 20 },
    emptyTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 13, textAlign: 'center' },
    emptyText: { color: colors.mutedForeground, fontSize: 13, lineHeight: 22, marginTop: 7, textAlign: 'center' },
    tree: { gap: 16 },
    artistBranch: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 10,
    },
    artistNodeRow: {
      minHeight: 76,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 7,
    },
    artistToggle: {
      width: 28,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    artistNodeContent: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 11,
    },
    artistAvatarGlow: {
      width: 62,
      height: 62,
      borderRadius: 31,
      padding: 3,
      backgroundColor: withAlpha(colors.primary, 0.18),
      borderWidth: 1,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.55,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
      elevation: 7,
    },
    artistAvatar: { width: '100%', height: '100%', borderRadius: 29 },
    artistAvatarFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 29,
      backgroundColor: colors.accent,
    },
    artistNodeCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    artistNodeTitle: {
      color: colors.foreground,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'right',
    },
    children: { borderRightWidth: 1, borderRightColor: colors.border, marginRight: 23, paddingRight: 10, marginTop: 7, gap: 9 },
    albumBranch: { gap: 6 },
    nodeHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    toggle: { width: 28, height: 40, alignItems: 'center', justifyContent: 'center' },
    nodeButton: {
      flex: 1,
      minHeight: 58,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: withAlpha(colors.foreground, 0.055),
      borderWidth: 1,
      borderColor: withAlpha(colors.foreground, 0.1),
    },
    nodeIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: withAlpha(colors.primary, 0.13),
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeArtwork: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nodeCopy: { flex: 1, minWidth: 0 },
    nodeTitle: { flex: 1, flexShrink: 1, color: colors.cardForeground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    nodeCaption: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 3 },
    trackChildren: { marginRight: 37, borderRightWidth: 1, borderRightColor: colors.border, paddingRight: 10, gap: 6 },
    trackNode: {
      minHeight: 46,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 13,
      borderRadius: 20,
      backgroundColor: withAlpha(colors.foreground, 0.04),
      borderWidth: 1,
      borderColor: withAlpha(colors.foreground, 0.07),
    },
    groupLabel: { color: colors.mutedForeground, fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 7 },
    unassignedBranch: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 12, gap: 7 },
    toast: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 88,
      minHeight: 50,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 15,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
      shadowColor: colors.background,
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 9,
    },
    toastText: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    pressed: { opacity: 0.74 },
  });
}