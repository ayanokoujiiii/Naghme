import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { MINI_PLAYER_CONTENT_PADDING, useMiniPlayerActive } from '@/hooks/useMiniPlayerActive';
import { playTracksInQueue } from '@/src/audio/audioManager';
import {
  AlbumRecord,
  ArtistRecord,
  getAlbumTracks,
  getAlbums,
  getArtistAlbumLinks,
  getArtists,
  getTracks,
  getWorks,
  TrackRecord,
  WorkRecord,
} from '@/src/db/queries';
import {
  getMusicGraphNeighborhood,
  MusicGraphData,
  MusicGraphEdge,
  MusicGraphNode,
  MusicGraphNodeType,
} from '@/src/graph/musicGraph';
import { withAlpha } from '@/src/player/coverColors';

type GraphViewMode = 'browse' | 'relations';
type ExpandedState = Record<string, boolean>;
type GraphAlbum = AlbumRecord & { tracks: TrackRecord[] };
type GraphArtist = ArtistRecord & { albums: GraphAlbum[] };
type BrowseData = {
  artists: GraphArtist[];
  unassignedAlbums: GraphAlbum[];
  unassignedTracks: TrackRecord[];
  works: WorkRecord[];
};
type FocusRef = {
  id: string;
  type: MusicGraphNodeType | null;
  label: string;
};
type RelationGroupKey = 'credits' | 'relatedArtists' | 'artists' | 'albums' | 'tracks' | 'workVersion';
type RelationFilter = RelationGroupKey | 'all';
type GraphQueueTrack = TrackRecord & { artistName: string | null };
type RelationPickerItem = {
  id: string;
  type: MusicGraphNodeType;
  label: string;
  meta: string;
};

const RELATION_LIMIT = 6;

export default function GraphScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const { focusId, focusType } = useLocalSearchParams<{
    focusId?: string | string[];
    focusType?: string | string[];
  }>();
  const requestedFocusId = Array.isArray(focusId) ? focusId[0] : focusId;
  const requestedFocusType = parseNodeType(Array.isArray(focusType) ? focusType[0] : focusType);
  const [viewMode, setViewMode] = useState<GraphViewMode>('browse');
  const [browseData, setBrowseData] = useState<BrowseData | null>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [relationData, setRelationData] = useState<MusicGraphData | null>(null);
  const [focused, setFocused] = useState<FocusRef | null>(null);
  const [history, setHistory] = useState<FocusRef[]>([]);
  const [relationFilter, setRelationFilter] = useState<RelationFilter>('all');
  const [relationLimits, setRelationLimits] = useState<Record<string, number>>({});
  const [relationSearch, setRelationSearch] = useState<string>('');
  const [ignoreRequestedFocus, setIgnoreRequestedFocus] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [relationLoading, setRelationLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  const loadBrowse = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [artistItems, albumItems, trackItems, workItems] = await Promise.all([
        getArtists(),
        getAlbums(),
        getTracks(),
        getWorks(),
      ]);
      const [artistLinks, albumTrackLists] = await Promise.all([
        Promise.all(artistItems.map((artist) => getArtistAlbumLinks(artist.id))),
        Promise.all(albumItems.map(async (album) => ({
          albumId: album.id,
          tracks: await getAlbumTracks(album.id),
        }))),
      ]);
      const albumsById = new Map(albumItems.map((album) => [album.id, album]));
      const tracksByAlbum = new Map(albumTrackLists.map((entry) => [entry.albumId, entry.tracks as TrackRecord[]]));
      const linksByArtist = new Map(artistLinks.map((links, index) => [artistItems[index].id, links]));
      const linkedAlbumIds = new Set<string>();
      const albumTrackIds = new Set(albumTrackLists.flatMap((entry) => entry.tracks.map((track) => track.id)));

      const nextArtists = artistItems.map((artist) => {
        const albums = (linksByArtist.get(artist.id) ?? [])
          .map((link) => albumsById.get(link.albumId))
          .filter((album): album is AlbumRecord => Boolean(album))
          .map((album) => {
            linkedAlbumIds.add(album.id);
            return { ...album, tracks: tracksByAlbum.get(album.id) ?? [] };
          });
        return { ...artist, albums };
      });
      const nextUnassignedAlbums = albumItems
        .filter((album) => !linkedAlbumIds.has(album.id))
        .map((album) => ({ ...album, tracks: tracksByAlbum.get(album.id) ?? [] }));

      setBrowseData({
        artists: nextArtists,
        unassignedAlbums: nextUnassignedAlbums,
        unassignedTracks: trackItems.filter((track) => !albumTrackIds.has(track.id)),
        works: workItems,
      });
      const nextExpanded: ExpandedState = {};
      nextArtists.forEach((artist) => {
        nextExpanded[`artist:${artist.id}`] = true;
        artist.albums.forEach((album) => {
          nextExpanded[`album:${album.id}`] = false;
        });
      });
      nextUnassignedAlbums.forEach((album) => {
        nextExpanded[`album:${album.id}`] = false;
      });
      setExpanded(nextExpanded);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن آرشیو انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRelations = useCallback(async (target: FocusRef) => {
    setRelationLoading(true);
    setError('');
    try {
      const graph = await getMusicGraphNeighborhood(target.type, target.id);
      const center = graph.nodes.find((node) => node.id === target.id);
      if (!center) throw new Error('این مورد در آرشیو پیدا نشد.');
      setRelationData(graph);
      setFocused({ id: center.id, type: center.type, label: center.label });
      setRelationFilter('all');
      setRelationLimits({});
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن روابط انجام نشد.');
    } finally {
      setRelationLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBrowse();
    }, [loadBrowse]),
  );

  useEffect(() => {
    if (viewMode !== 'relations' || relationLoading) return;
    if (requestedFocusId && !ignoreRequestedFocus) {
      void loadRelations({
        id: requestedFocusId,
        type: requestedFocusType,
        label: 'مورد انتخاب‌شده',
      });
      return;
    }
  }, [
    browseData,
    loadRelations,
    requestedFocusId,
    requestedFocusType,
    ignoreRequestedFocus,
    viewMode,
  ]);

  const toggleExpanded = (key: string) => {
    setExpanded((current) => ({ ...current, [key]: !current[key] }));
  };

  const showToast = (message: string) => {
    setToast('');
    requestAnimationFrame(() => setToast(message));
  };

  const playQueue = async (tracks: TrackRecord[]) => {
    const playableTracks = tracks.filter((track) => Boolean(track.audioUri));
    if (!playableTracks.length) {
      showToast('فایل قابل پخشی برای این مورد پیدا نشد.');
      return;
    }
    const started = await playTracksInQueue(playableTracks, 0);
    showToast(started ? 'صف پخش شروع شد.' : 'پخش قطعه‌ها ممکن نیست.');
    if (started) router.push('/player');
  };

  const playBrowseTrack = async (track: TrackRecord) => {
    const albumTracks = browseData?.unassignedTracks.some((item) => item.id === track.id)
      ? [track]
      : browseData
        ? findAlbumTracks(browseData, track.id)
        : [track];
    await playQueue(albumTracks.length ? albumTracks : [track]);
  };

  const playFocusedNode = async () => {
    if (!focused || !relationData) return;
    const nodeMap = new Map(relationData.nodes.map((node) => [node.id, node]));
    const node = nodeMap.get(focused.id);
    if (!node) return;
    await playNode(node, relationData, nodeMap, browseData, playQueue, showToast);
  };

  const focusNode = (node: MusicGraphNode) => {
    if (node.id === focused?.id) return;
    if (focused) setHistory((current) => [...current, focused]);
    setViewMode('relations');
    void loadRelations({ id: node.id, type: node.type, label: node.label });
  };

  const clearRelationFocus = () => {
    setFocused(null);
    setRelationData(null);
    setHistory([]);
    setRelationSearch('');
    setIgnoreRequestedFocus(true);
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    void loadRelations(previous);
  };

  const openFocusedDetails = () => {
    if (!focused || !relationData) return;
    const node = relationData.nodes.find((item) => item.id === focused.id);
    const path = node ? routeForNode(node) : null;
    if (path) router.push(path);
    else showToast('برای این مورد صفحه‌ی جداگانه‌ای وجود ندارد.');
  };

  const relationNodeMap = useMemo(
    () => new Map((relationData?.nodes ?? []).map((node) => [node.id, node])),
    [relationData],
  );
  const relationGroups = useMemo(
    () => groupRelationEdges(
      (relationData?.edges ?? []).filter((edge) => edge.from === focused?.id || edge.to === focused?.id),
      focused,
    ),
    [focused, relationData],
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
           آرشیو را به‌صورت درختی مرور کن یا ارتباط‌های هر هنرمند، آلبوم یا قطعه را راحت ببین.
        </Text>

        <View style={styles.modeSwitch} accessibilityRole="tablist">
          <Pressable
            testID="graph-view-browse"
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'browse' }}
            onPress={() => setViewMode('browse')}
            style={({ pressed }) => [
              styles.modeButton,
              viewMode === 'browse' && styles.modeButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="list" size={16} color={viewMode === 'browse' ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[styles.modeButtonText, viewMode === 'browse' && styles.modeButtonTextActive]}>مرور</Text>
          </Pressable>
          <Pressable
            testID="graph-view-relations"
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'relations' }}
            onPress={() => setViewMode('relations')}
            style={({ pressed }) => [
              styles.modeButton,
              viewMode === 'relations' && styles.modeButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="share-2" size={16} color={viewMode === 'relations' ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[styles.modeButtonText, viewMode === 'relations' && styles.modeButtonTextActive]}>روابط</Text>
          </Pressable>
        </View>

        {loading && !browseData ? (
          <View style={styles.status}><ActivityIndicator color={colors.primary} /></View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={17} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : viewMode === 'browse' ? (
          browseData ? (
            <BrowseView
              data={browseData}
              expanded={expanded}
              onToggle={toggleExpanded}
              onExpandAll={() => setExpanded(createExpandedState(browseData, true))}
              onCollapseAll={() => setExpanded(createExpandedState(browseData, false))}
              onPlayTrack={(track) => void playBrowseTrack(track)}
              colors={colors}
              styles={styles}
            />
          ) : null
        ) : relationLoading && !relationData ? (
          <View style={styles.status}><ActivityIndicator color={colors.primary} /></View>
        ) : relationData && focused ? (
          <RelationsView
            focused={focused}
            history={history}
            groups={relationGroups}
            nodeMap={relationNodeMap}
            relationFilter={relationFilter}
            relationLimits={relationLimits}
            onBack={goBack}
            onFilter={setRelationFilter}
            onFocus={focusNode}
            onOpenDetails={openFocusedDetails}
            onPlayFocused={() => void playFocusedNode()}
            onPlayNode={(node) => void playNode(node, relationData, relationNodeMap, browseData, playQueue, showToast)}
            onShowMore={(key) => setRelationLimits((current) => ({
              ...current,
              [key]: (current[key] ?? RELATION_LIMIT) + RELATION_LIMIT,
            }))}
            onChangeFocus={clearRelationFocus}
            colors={colors}
            styles={styles}
          />
        ) : (
          <RelationsPicker
            data={browseData}
            query={relationSearch}
            onQueryChange={setRelationSearch}
            onSelect={(item) => {
              setHistory([]);
              void loadRelations({ id: item.id, type: item.type, label: item.label });
            }}
            colors={colors}
            styles={styles}
          />
        )}
      </ScrollView>
      {toast ? (
        <View pointerEvents="none" style={styles.toast}>
          <Feather name="play-circle" size={17} color={colors.primary} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function BrowseView({
  data,
  expanded,
  onToggle,
  onExpandAll,
  onCollapseAll,
  onPlayTrack,
  colors,
  styles,
}: {
  data: BrowseData;
  expanded: ExpandedState;
  onToggle: (key: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onPlayTrack: (track: TrackRecord) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const hasContent = data.artists.length || data.unassignedAlbums.length || data.unassignedTracks.length;
  if (!hasContent) {
    return (
      <View style={styles.emptyState}>
        <Feather name="list" size={28} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>آرشیو هنوز خالی است</Text>
         <Text style={styles.emptyText}>از صفحه‌ی خانه چند داده‌ی نمونه اضافه کن یا یک هنرمند تازه بساز.</Text>
      </View>
    );
  }

  return (
    <View style={styles.tree}>
      <View style={styles.treeActions}>
        <Pressable
          testID="graph-expand-all"
          accessibilityRole="button"
          onPress={onExpandAll}
          style={({ pressed }) => [styles.treeAction, pressed && styles.pressed]}
        >
          <Feather name="plus-square" size={15} color={colors.primary} />
          <Text style={styles.treeActionText}>باز کردن همه</Text>
        </Pressable>
        <Pressable
          testID="graph-collapse-all"
          accessibilityRole="button"
          onPress={onCollapseAll}
          style={({ pressed }) => [styles.treeAction, pressed && styles.pressed]}
        >
          <Feather name="minus-square" size={15} color={colors.mutedForeground} />
          <Text style={styles.treeActionText}>بستن همه</Text>
        </Pressable>
      </View>
      {data.artists.map((artist) => (
        <View key={artist.id} style={styles.artistBranch}>
          <BrowseArtistRow
            artist={artist}
            expanded={Boolean(expanded[`artist:${artist.id}`])}
            onToggle={() => onToggle(`artist:${artist.id}`)}
            colors={colors}
            styles={styles}
          />
          {expanded[`artist:${artist.id}`] ? (
            <View style={styles.children}>
              {artist.albums.length ? artist.albums.map((album) => (
                <BrowseAlbumBranch
                  key={`${artist.id}:${album.id}`}
                  album={album}
                  expanded={Boolean(expanded[`album:${album.id}`])}
                  onToggle={() => onToggle(`album:${album.id}`)}
                  onPlayTrack={onPlayTrack}
                  colors={colors}
                  styles={styles}
                />
              )) : (
                <Text style={styles.branchEmpty}>برای این هنرمند هنوز آلبومی ثبت نشده است.</Text>
              )}
            </View>
          ) : null}
        </View>
      ))}

      {data.unassignedAlbums.length ? (
        <View style={styles.unassignedBranch}>
          <Text style={styles.groupLabel}>آلبوم‌های بدون هنرمند</Text>
          {data.unassignedAlbums.map((album) => (
            <BrowseAlbumBranch
              key={album.id}
              album={album}
              expanded={Boolean(expanded[`album:${album.id}`])}
              onToggle={() => onToggle(`album:${album.id}`)}
              onPlayTrack={onPlayTrack}
              colors={colors}
              styles={styles}
            />
          ))}
        </View>
      ) : null}

      {data.unassignedTracks.length ? (
        <View style={styles.unassignedBranch}>
          <Text style={styles.groupLabel}>قطعه‌های بدون آلبوم</Text>
          {data.unassignedTracks.map((track) => (
            <BrowseTrackRow
              key={track.id}
              track={track}
              onPlay={() => onPlayTrack(track)}
              colors={colors}
              styles={styles}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RelationsPicker({
  data,
  query,
  onQueryChange,
  onSelect,
  colors,
  styles,
}: {
  data: BrowseData | null;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (item: RelationPickerItem) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const items = useMemo<RelationPickerItem[]>(() => {
    if (!data) return [];
    const artists = data.artists.map((artist) => ({
      id: artist.id,
      type: 'artist' as const,
      label: artist.name,
      meta: `${artist.albums.length} آلبوم`,
    }));
    const albums = [
      ...data.artists.flatMap((artist) => artist.albums),
      ...data.unassignedAlbums,
    ].filter((album, index, all) => all.findIndex((candidate) => candidate.id === album.id) === index)
      .map((album) => ({
        id: album.id,
        type: 'album' as const,
        label: album.title,
        meta: `${album.tracks.length} قطعه`,
      }));
    const tracks = [
      ...data.artists.flatMap((artist) => artist.albums.flatMap((album) => album.tracks)),
      ...data.unassignedTracks,
    ].filter((track, index, all) => all.findIndex((candidate) => candidate.id === track.id) === index)
      .map((track) => ({
        id: track.id,
        type: 'track' as const,
        label: track.title,
        meta: 'قطعه',
      }));
    const works = data.works.map((work) => ({
      id: work.id,
      type: 'work' as const,
      label: work.title,
      meta: 'اثر',
    }));
    return [...artists, ...albums, ...tracks, ...works];
  }, [data]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = normalizedQuery
    ? items.filter((item) => item.label.toLocaleLowerCase().includes(normalizedQuery))
    : items
      .filter((item) => item.type === 'artist')
      .sort((a, b) => Number(b.meta.split(' ')[0]) - Number(a.meta.split(' ')[0]))
      .slice(0, 5);

  return (
    <View style={styles.picker}>
      <View style={styles.pickerHeading}>
        <View style={styles.pickerHeadingCopy}>
          <Text style={styles.emptyTitle}>چه چیزی را ببینیم؟</Text>
           <Text style={styles.pickerHint}>هنرمند، آلبوم، قطعه یا اثر را برای دیدن ارتباط‌ها انتخاب کن.</Text>
        </View>
        <Feather name="search" size={20} color={colors.primary} />
      </View>
      <View style={styles.pickerInputWrap}>
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          testID="graph-relation-search"
          value={query}
          onChangeText={onQueryChange}
          placeholder="جست‌وجو در آرشیو…"
          placeholderTextColor={colors.mutedForeground}
          style={styles.pickerInput}
          textAlign="right"
          autoCorrect={false}
        />
      </View>
      <Text style={styles.pickerSectionLabel}>{normalizedQuery ? 'نتیجه‌های جست‌وجو' : 'پیشنهادهای سریع'}</Text>
      {results.length ? results.map((item) => (
        <Pressable
          key={`${item.type}:${item.id}`}
          testID={`graph-relation-picker-${item.type}-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={`انتخاب ${item.label}`}
          onPress={() => onSelect(item)}
          style={({ pressed }) => [styles.pickerResult, pressed && styles.pressed]}
        >
          <Feather name={artworkIcon(item.type)} size={17} color={artworkIconColor(item.type, colors)} />
          <View style={styles.pickerResultCopy}>
            <Text style={styles.pickerResultTitle} numberOfLines={1}>{item.label}</Text>
            <Text style={styles.pickerResultMeta}>{nodeTypeLabel(item.type)} · {item.meta}</Text>
          </View>
          <Feather name="arrow-left" size={15} color={colors.mutedForeground} />
        </Pressable>
      )) : (
        <Text style={styles.pickerEmpty}>موردی با این نام پیدا نشد.</Text>
      )}
    </View>
  );
}

function BrowseArtistRow({
  artist,
  expanded,
  onToggle,
  colors,
  styles,
}: {
  artist: GraphArtist;
  expanded: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.artistRow}>
      <Pressable
        testID={`graph-browse-artist-${artist.id}`}
        accessibilityRole="button"
        accessibilityLabel={expanded ? `بستن آلبوم‌های ${artist.name}` : `باز کردن آلبوم‌های ${artist.name}`}
        onPress={onToggle}
        style={({ pressed }) => [styles.artistContent, pressed && styles.pressed]}
      >
        <Artwork uri={artist.profileImage ?? artist.image} kind="artist" size={62} colors={colors} styles={styles} />
        <View style={styles.artistCopy}>
          <Text style={styles.artistTitle} numberOfLines={1}>{artist.name}</Text>
          <Text style={styles.nodeCaption}>
            {artist.albums.length
              ? `${artist.albums.length} آلبوم${expanded ? '' : ' — برای دیدن آلبوم‌ها انتخاب کن'}`
              : 'بدون آلبوم ثبت‌شده'}
          </Text>
        </View>
      </Pressable>
      <Pressable
        testID={`graph-browse-artist-details-${artist.id}`}
        accessibilityRole="button"
        accessibilityLabel={`باز کردن صفحه‌ی ${artist.name}`}
        onPress={() => router.push(`/artist/${artist.id}`)}
        style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
      >
        <Text style={styles.detailsButtonText}>صفحه‌ی هنرمند</Text>
      </Pressable>
    </View>
  );
}

function BrowseAlbumBranch({
  album,
  expanded,
  onToggle,
  onPlayTrack,
  colors,
  styles,
}: {
  album: GraphAlbum;
  expanded: boolean;
  onToggle: () => void;
  onPlayTrack: (track: TrackRecord) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.albumBranch}>
      <View style={styles.albumRow}>
        <Pressable
          testID={`graph-browse-album-${album.id}`}
          accessibilityRole="button"
          accessibilityLabel={expanded ? `بستن قطعه‌های ${album.title}` : `باز کردن قطعه‌های ${album.title}`}
          onPress={onToggle}
          style={({ pressed }) => [styles.albumContent, pressed && styles.pressed]}
        >
          <Artwork uri={album.coverImage} kind="album" size={40} colors={colors} styles={styles} />
          <View style={styles.nodeCopy}>
            <Text style={styles.nodeTitle} numberOfLines={1}>{album.title}</Text>
            <Text style={styles.nodeCaption}>{album.tracks.length ? `${album.tracks.length} قطعه` : 'بدون قطعه'}</Text>
          </View>
        </Pressable>
        <Pressable
          testID={`graph-browse-album-details-${album.id}`}
          accessibilityRole="button"
          accessibilityLabel={`باز کردن صفحه‌ی ${album.title}`}
          onPress={() => router.push(`/album/${album.id}`)}
          style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
        >
          <Text style={styles.detailsButtonText}>صفحه‌ی آلبوم</Text>
        </Pressable>
      </View>
      {expanded ? (
        <View style={styles.trackChildren}>
          {album.tracks.length ? album.tracks.map((track) => (
            <BrowseTrackRow
              key={track.id}
              track={track}
              onPlay={() => onPlayTrack(track)}
              colors={colors}
              styles={styles}
            />
          )) : (
            <Text style={styles.branchEmpty}>این آلبوم هنوز قطعه‌ای ندارد.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function BrowseTrackRow({
  track,
  onPlay,
  colors,
  styles,
}: {
  track: TrackRecord;
  onPlay: () => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.trackRow}>
      <Pressable
        testID={`graph-browse-track-${track.id}`}
        accessibilityRole="button"
        accessibilityLabel={`باز کردن قطعه‌ی ${track.title}`}
        onPress={() => router.push(`/track/${track.id}`)}
        style={({ pressed }) => [styles.trackContent, pressed && styles.pressed]}
      >
        <Feather name="music" size={16} color={colors.accentForeground} />
        <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
      </Pressable>
      <Pressable
        testID={`graph-play-track-${track.id}`}
        accessibilityRole="button"
        accessibilityLabel={`پخش صف از قطعه‌ی ${track.title}`}
        onPress={onPlay}
        style={({ pressed }) => [styles.smallPlayButton, pressed && styles.pressed]}
      >
        <Feather name="play" size={14} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

function RelationsView({
  focused,
  history,
  groups,
  nodeMap,
  relationFilter,
  relationLimits,
  onBack,
  onFilter,
  onFocus,
  onOpenDetails,
  onPlayFocused,
  onPlayNode,
  onShowMore,
  onChangeFocus,
  colors,
  styles,
}: {
  focused: FocusRef;
  history: FocusRef[];
  groups: Array<{ key: RelationGroupKey; label: string; edges: MusicGraphEdge[] }>;
  nodeMap: Map<string, MusicGraphNode>;
  relationFilter: RelationFilter;
  relationLimits: Record<string, number>;
  onBack: () => void;
  onFilter: (filter: RelationFilter) => void;
  onFocus: (node: MusicGraphNode) => void;
  onOpenDetails: () => void;
  onPlayFocused: () => void;
  onPlayNode: (node: MusicGraphNode) => void;
  onShowMore: (key: RelationGroupKey) => void;
  onChangeFocus: () => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const focusedNode = nodeMap.get(focused.id);
  if (!focusedNode) return null;
  const previous = history[history.length - 1];
  const relationFilters: Array<{ key: RelationFilter; label: string; icon: 'layers' | 'award' | 'users' | 'disc' | 'music' | 'git-branch' }> = [
    { key: 'all', label: 'همه', icon: 'layers' },
    { key: 'credits', label: 'مشارکت‌ها', icon: 'award' },
    { key: 'relatedArtists', label: 'هنرمندان مرتبط', icon: 'users' },
    { key: 'albums', label: 'آلبوم‌ها', icon: 'disc' },
    { key: 'tracks', label: 'قطعه‌ها', icon: 'music' },
    { key: 'workVersion', label: 'اثر و نسخه', icon: 'git-branch' },
  ];
  const visibleGroups = relationFilter === 'all'
    ? groups
    : groups.filter((group) => group.key === relationFilter);

  return (
    <View>
      <View style={styles.focusCard}>
        <Artwork
          uri={focusedNode.imageUri ?? focusedNode.coverImage}
          kind={focusedNode.type}
          size={76}
          colors={colors}
          styles={styles}
        />
        <View style={styles.focusCopy}>
          <Text style={styles.focusTitle} numberOfLines={2}>{focusedNode.label}</Text>
          <Text style={styles.focusMeta}>{nodeTypeLabel(focusedNode.type)}</Text>
        </View>
      </View>

      <View style={styles.focusActions}>
        <Pressable
          testID="graph-play-focused"
          accessibilityRole="button"
          onPress={onPlayFocused}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
        >
          <Feather name="play" size={16} color={colors.primaryForeground} />
          <Text style={styles.primaryActionText}>پخش این فهرست</Text>
        </Pressable>
        <View style={styles.focusSecondaryActions}>
          <Pressable
            testID="graph-change-focus"
            accessibilityRole="button"
            onPress={onChangeFocus}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryActionText}>انتخاب دیگر</Text>
          </Pressable>
          <Pressable
            testID="graph-open-details"
            accessibilityRole="button"
            onPress={onOpenDetails}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryActionText}>صفحه‌ی جزئیات</Text>
          </Pressable>
        </View>
      </View>

      {previous ? (
        <Pressable
          testID="graph-back"
          accessibilityRole="button"
          accessibilityLabel={`بازگشت به ${previous.label}`}
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-right" size={16} color={colors.primary} />
          <Text style={styles.backButtonText}>بازگشت به {previous.label}</Text>
        </Pressable>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.relationFilterContent}
      >
        {relationFilters.map((filter) => (
          <Pressable
            key={filter.key}
            testID={`graph-relation-filter-${filter.key}`}
            accessibilityRole="button"
            accessibilityState={{ selected: relationFilter === filter.key }}
            onPress={() => onFilter(filter.key)}
            style={({ pressed }) => [
              styles.relationFilterChip,
              relationFilter === filter.key && styles.relationFilterChipActive,
              pressed && styles.pressed,
            ]}
          >
            <Feather
              name={filter.icon}
              size={14}
              color={relationFilter === filter.key ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text style={[
              styles.relationFilterText,
              relationFilter === filter.key && styles.relationFilterTextActive,
            ]}>{filter.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {visibleGroups.length ? (
        <View style={styles.relationGroups}>
          {visibleGroups.map((group) => {
            const limit = relationLimits[group.key] ?? RELATION_LIMIT;
            const visibleEdges = group.edges.slice(0, limit);
            return (
              <View key={group.key} style={styles.relationGroup}>
                <View style={styles.groupHeading}>
                  <View style={styles.groupHeadingCopy}>
                    <Text style={styles.groupTitle}>{group.label}</Text>
                    <Text style={styles.groupDescription}>{relationGroupDescription(group.key)}</Text>
                  </View>
                  <Text style={styles.groupCount}>{group.edges.length.toString()}</Text>
                </View>
                <View style={styles.relationCard}>
                  {visibleEdges.map((edge) => {
                    const neighborId = edge.from === focused.id ? edge.to : edge.from;
                    const neighbor = nodeMap.get(neighborId);
                    if (!neighbor) return null;
                    return (
                      <RelationRow
                        key={edge.id}
                        edge={edge}
                        node={neighbor}
                        onFocus={() => onFocus(neighbor)}
                        onPlay={() => onPlayNode(neighbor)}
                        colors={colors}
                        styles={styles}
                      />
                    );
                  })}
                </View>
                {group.edges.length > limit ? (
                  <Pressable
                    testID={`graph-show-more-${group.key}`}
                    accessibilityRole="button"
                    onPress={() => onShowMore(group.key)}
                    style={({ pressed }) => [styles.showMoreButton, pressed && styles.pressed]}
                  >
                    <Feather name="plus" size={15} color={colors.primary} />
                    <Text style={styles.showMoreText}>نمایش بیشتر</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.noRelations}>
          <Feather name="info" size={23} color={colors.mutedForeground} />
          <Text style={styles.noRelationsTitle}>
             {groups.length ? 'در این دسته ارتباطی پیدا نشد.' : 'هنوز ارتباطی برای این مورد ثبت نشده است.'}
          </Text>
          <Text style={styles.noRelationsText}>
            {groups.length ? 'دسته‌ی دیگری را امتحان کن.' : emptyRelationHint(focusedNode.type)}
          </Text>
        </View>
      )}
    </View>
  );
}

function RelationRow({
  edge,
  node,
  onFocus,
  onPlay,
  colors,
  styles,
}: {
  edge: MusicGraphEdge;
  node: MusicGraphNode;
  onFocus: () => void;
  onPlay: () => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.relationRow}>
      <Pressable
        testID={`graph-relation-${edge.id}`}
        accessibilityRole="button"
        accessibilityLabel={`تمرکز روی ${node.label}`}
        onPress={onFocus}
        style={({ pressed }) => [styles.relationContent, pressed && styles.pressed]}
      >
        <Artwork uri={node.imageUri ?? node.coverImage} kind={node.type} size={42} colors={colors} styles={styles} />
        <View style={styles.relationCopy}>
          <Text style={styles.relationTitle} numberOfLines={2}>{node.label}</Text>
          <Text style={styles.relationMeta} numberOfLines={2}>
            {nodeTypeLabel(node.type)} · {edge.label ?? 'پیوندی در آرشیو'}
          </Text>
        </View>
        <Feather name="arrow-left" size={15} color={colors.mutedForeground} />
      </Pressable>
      {node.type === 'track' || node.type === 'album' ? (
        <Pressable
          testID={`graph-relation-play-${node.id}`}
          accessibilityRole="button"
          accessibilityLabel={`پخش صف ${node.label}`}
          onPress={onPlay}
          style={({ pressed }) => [styles.smallPlayButton, pressed && styles.pressed]}
        >
          <Feather name="play" size={14} color={colors.primaryForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Artwork({
  uri,
  kind,
  size,
  colors,
  styles,
}: {
  uri: string | null | undefined;
  kind: MusicGraphNodeType | 'artist';
  size: number;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const radius = kind === 'artist' ? size / 2 : Math.max(10, Math.round(size * 0.22));
  return (
    <View style={[
      styles.artwork,
      { width: size, height: size, borderRadius: radius, backgroundColor: artworkBackground(kind, colors) },
    ]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} resizeMode="cover" />
      ) : (
        <Feather name={artworkIcon(kind)} size={Math.max(16, Math.round(size * 0.36))} color={artworkIconColor(kind, colors)} />
      )}
    </View>
  );
}

function groupRelationEdges(
  edges: MusicGraphEdge[],
  focused: FocusRef | null,
): Array<{ key: RelationGroupKey; label: string; edges: MusicGraphEdge[] }> {
  if (!focused) return [];
  const groups = new Map<RelationGroupKey, MusicGraphEdge[]>();
  edges.forEach((edge) => {
    const key = relationGroupKey(edge, focused.type);
    if (!key) return;
    const current = groups.get(key) ?? [];
    current.push(edge);
    groups.set(key, current);
  });
  const labels: Record<RelationGroupKey, string> = {
    credits: 'مشارکت‌ها',
    relatedArtists: 'هنرمندان مرتبط',
    artists: 'هنرمندان',
    albums: 'آلبوم‌ها',
    tracks: 'قطعه‌ها',
    workVersion: 'اثر و نسخه',
  };
  const order: RelationGroupKey[] = ['credits', 'relatedArtists', 'albums', 'tracks', 'workVersion', 'artists'];
  return order
    .filter((key) => groups.has(key))
    .map((key) => ({ key, label: labels[key], edges: groups.get(key) ?? [] }));
}

function relationGroupDescription(key: RelationGroupKey): string {
  if (key === 'credits') return 'چه کسی در ساخت این اثر نقش داشته و با چه نقشی.';
  if (key === 'relatedArtists') return 'ارتباط این هنرمند با هنرمندان دیگر، مستقل از یک اثر خاص.';
  return 'پیوندی که در آرشیو موسیقی ثبت شده است.';
}

function relationGroupKey(
  edge: MusicGraphEdge,
  focusedType: MusicGraphNodeType | null,
): RelationGroupKey | null {
  if (edge.type === 'credit') return 'credits';
  if (edge.type === 'artist-artist') return 'relatedArtists';
  if (edge.type === 'artist-album') return focusedType === 'artist' ? 'albums' : 'artists';
  if (edge.type === 'album-track') return focusedType === 'album' ? 'tracks' : 'albums';
  if (edge.type === 'artist-track') return focusedType === 'artist' ? 'tracks' : 'artists';
  if (edge.type === 'track-work' || edge.type === 'track-version' || edge.type === 'work-version') {
    return 'workVersion';
  }
  return null;
}

function getQueueForNode(
  node: MusicGraphNode,
  data: MusicGraphData,
  nodeMap: Map<string, MusicGraphNode>,
): GraphQueueTrack[] {
  const trackIds = new Set<string>();
  const tracksByAlbum = new Map<string, string[]>();
  data.edges
    .filter((edge) => edge.type === 'album-track')
    .forEach((edge) => {
      const tracks = tracksByAlbum.get(edge.from) ?? [];
      tracks.push(edge.to);
      tracksByAlbum.set(edge.from, tracks);
    });
  const addTrack = (id: string) => {
    const candidate = nodeMap.get(id);
    if (candidate?.type === 'track' && candidate.audioUri) trackIds.add(id);
  };
  const addAlbumTracks = (albumId: string) => {
    (tracksByAlbum.get(albumId) ?? []).forEach(addTrack);
  };

  if (node.type === 'album') {
    addAlbumTracks(node.id);
  } else if (node.type === 'track') {
    const albumIds = data.edges
      .filter((edge) => edge.type === 'album-track' && edge.to === node.id)
      .map((edge) => edge.from);
    if (albumIds.length) albumIds.forEach(addAlbumTracks);
    else addTrack(node.id);
  } else {
    data.edges
      .filter((edge) => edge.from === node.id || edge.to === node.id)
      .forEach((edge) => {
        if (edge.type === 'artist-track' && edge.from === node.id) addTrack(edge.to);
        if (edge.type === 'credit' && edge.to === node.id) addTrack(edge.from);
        if (edge.type === 'artist-album' && edge.from === node.id) addAlbumTracks(edge.to);
        if (edge.type === 'track-work' && edge.to === node.id) addTrack(edge.from);
        if (edge.type === 'track-version' && edge.to === node.id) addTrack(edge.from);
      });
  }
  return [...trackIds]
    .map((id) => nodeMap.get(id))
    .filter((track): track is MusicGraphNode => Boolean(track && track.type === 'track'))
    .map(toTrackRecord);
}

async function playNode(
  node: MusicGraphNode,
  data: MusicGraphData,
  nodeMap: Map<string, MusicGraphNode>,
  browseData: BrowseData | null,
  playQueue: (tracks: TrackRecord[]) => Promise<void>,
  showToast: (message: string) => void,
) {
  let tracks = getQueueForNode(node, data, nodeMap);
  if (browseData && node.type === 'album') {
    const album = findBrowseAlbum(browseData, node.id);
    tracks = album?.tracks.map((track) => ({ ...track, artistName: null })) ?? tracks;
  } else if (browseData && node.type === 'track') {
    const albumTracks = findAlbumTracks(browseData, node.id);
    const browseTrack = findBrowseTrack(browseData, node.id);
    tracks = (albumTracks.length ? albumTracks : browseTrack ? [browseTrack] : [])
      .map((track) => ({ ...track, artistName: null }));
  }
  if (!tracks.length) {
    showToast('فایل قابل پخشی برای این مورد پیدا نشد.');
    return;
  }
  await playQueue(tracks);
}

function toTrackRecord(node: MusicGraphNode): GraphQueueTrack {
  return {
    id: node.id,
    title: node.label,
    duration: node.durationSeconds ?? null,
    artistId: null,
    albumId: node.albumId ?? null,
    audioUri: node.audioUri ?? null,
    coverImage: node.coverImage ?? node.imageUri,
    lyrics: node.lyrics ?? null,
    sheetMusicUri: node.sheetMusicUri ?? null,
    versionName: node.versionName ?? null,
    workId: node.workId ?? null,
    versionId: node.versionId ?? null,
    artistName: node.artistName ?? null,
  };
}

function findAlbumTracks(data: BrowseData, trackId: string): TrackRecord[] {
  for (const artist of data.artists) {
    for (const album of artist.albums) {
      if (album.tracks.some((track) => track.id === trackId)) return album.tracks;
    }
  }
  for (const album of data.unassignedAlbums) {
    if (album.tracks.some((track) => track.id === trackId)) return album.tracks;
  }
  return [];
}

function findBrowseAlbum(data: BrowseData, albumId: string): GraphAlbum | null {
  for (const artist of data.artists) {
    const album = artist.albums.find((item) => item.id === albumId);
    if (album) return album;
  }
  return data.unassignedAlbums.find((album) => album.id === albumId) ?? null;
}

function findBrowseTrack(data: BrowseData, trackId: string): TrackRecord | null {
  const albumTracks = findAlbumTracks(data, trackId);
  if (albumTracks.length) return albumTracks.find((track) => track.id === trackId) ?? null;
  return data.unassignedTracks.find((track) => track.id === trackId) ?? null;
}

function chooseBrowseFocus(data: BrowseData): FocusRef | null {
  const artist = data.artists.find((item) => item.albums.length) ?? data.artists[0];
  if (artist) return { id: artist.id, type: 'artist', label: artist.name };
  const album = data.unassignedAlbums[0];
  if (album) return { id: album.id, type: 'album', label: album.title };
  const track = data.unassignedTracks[0];
  return track ? { id: track.id, type: 'track', label: track.title } : null;
}

function createExpandedState(data: BrowseData, expand: boolean): ExpandedState {
  const next: ExpandedState = {};
  data.artists.forEach((artist) => {
    next[`artist:${artist.id}`] = expand;
    artist.albums.forEach((album) => {
      next[`album:${album.id}`] = expand;
    });
  });
  data.unassignedAlbums.forEach((album) => {
    next[`album:${album.id}`] = expand;
  });
  return next;
}

function parseNodeType(value: string | undefined): MusicGraphNodeType | null {
  return value === 'artist' || value === 'album' || value === 'track' || value === 'work' || value === 'version'
    ? value
    : null;
}

function routeForNode(node: MusicGraphNode): `/artist/${string}` | `/album/${string}` | `/track/${string}` | `/work/${string}` | null {
  if (node.type === 'artist') return `/artist/${node.id}`;
  if (node.type === 'album') return `/album/${node.id}`;
  if (node.type === 'track') return `/track/${node.id}`;
  if (node.type === 'work') return `/work/${node.id}`;
  return null;
}

function nodeTypeLabel(type: MusicGraphNodeType): string {
  return {
    artist: 'هنرمند',
    album: 'آلبوم',
    track: 'قطعه',
    work: 'اثر',
    version: 'نسخه',
  }[type];
}

function emptyRelationHint(type: MusicGraphNodeType): string {
  if (type === 'album') return 'برای این آلبوم هنرمندی ثبت نشده؛ از فرم ویرایش آلبوم اضافه کن.';
   if (type === 'artist') return 'از فرم آلبوم یا ارتباط هنرمندان، یک ارتباط تازه ثبت کن.';
  if (type === 'track') return 'این قطعه را به آلبوم، اثر یا مشارکت‌کننده متصل کن.';
  if (type === 'work') return 'از صفحه‌ی اثر، قطعه‌ها یا نسخه‌های مرتبط را اضافه کن.';
  return 'این نسخه هنوز به قطعه یا اثر دیگری متصل نشده است.';
}

function artworkIcon(type: MusicGraphNodeType | 'artist'): 'mic' | 'disc' | 'music' | 'book-open' | 'layers' {
  if (type === 'artist') return 'mic';
  if (type === 'album') return 'disc';
  if (type === 'track') return 'music';
  if (type === 'work') return 'book-open';
  return 'layers';
}

function artworkBackground(type: MusicGraphNodeType | 'artist', colors: ReturnType<typeof useColors>): string {
  if (type === 'artist') return withAlpha(colors.primary, 0.16);
  if (type === 'album') return withAlpha(colors.accent, 0.18);
  if (type === 'track') return withAlpha(colors.secondaryForeground, 0.14);
  if (type === 'work') return withAlpha(colors.destructive, 0.14);
  return withAlpha(colors.mutedForeground, 0.16);
}

function artworkIconColor(type: MusicGraphNodeType | 'artist', colors: ReturnType<typeof useColors>): string {
  if (type === 'artist') return colors.primary;
  if (type === 'album') return colors.accentForeground;
  if (type === 'track') return colors.secondaryForeground;
  if (type === 'work') return colors.destructive;
  return colors.mutedForeground;
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 104 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13, marginBottom: 15 },
    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 17,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
   headerCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, marginBottom: 4, textAlign: 'right' },
    title: { color: colors.foreground, fontSize: 30, lineHeight: 38, fontWeight: '700', textAlign: 'right' },
    intro: { color: colors.mutedForeground, fontSize: 13, lineHeight: 23, textAlign: 'right', marginBottom: 16 },
    modeSwitch: {
      flexDirection: 'row-reverse',
      gap: 7,
      padding: 4,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    modeButton: {
      flex: 1,
      minHeight: 40,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 14,
      paddingHorizontal: 12,
    },
    modeButtonActive: { backgroundColor: colors.primary },
    modeButtonText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '700' },
    modeButtonTextActive: { color: colors.primaryForeground },
    status: { minHeight: 380, alignItems: 'center', justifyContent: 'center' },
    errorBox: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      backgroundColor: withAlpha(colors.destructive, 0.12),
      borderRadius: 15,
      padding: 13,
    },
    errorText: { flex: 1, color: colors.destructive, fontSize: 13, lineHeight: 21, textAlign: 'right' },
    emptyState: {
      minHeight: 320,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 24,
    },
    emptyTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 13, textAlign: 'center' },
    emptyText: { color: colors.mutedForeground, fontSize: 13, lineHeight: 22, marginTop: 8, textAlign: 'center' },
    tree: { gap: 16 },
    artistBranch: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: 10,
    },
    artistRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, minHeight: 76 },
    artistContent: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 6,
      borderRadius: 18,
    },
    artistCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    artistTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', textAlign: 'right' },
    treeActions: { flexDirection: 'row-reverse', gap: 8, marginBottom: 2 },
    treeAction: {
      minHeight: 44,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 11,
      borderRadius: 13,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    treeActionText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    detailsButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 9,
      borderRadius: 12,
      backgroundColor: 'transparent',
    },
    detailsButtonText: { color: colors.primary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
    children: { borderRightWidth: 1, borderRightColor: colors.border, marginRight: 28, paddingRight: 10, marginTop: 8, gap: 9 },
    albumBranch: { gap: 7 },
    albumRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    albumContent: {
      flex: 1,
      minWidth: 0,
      minHeight: 60,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      borderRadius: 19,
      backgroundColor: withAlpha(colors.foreground, 0.055),
      borderWidth: 1,
      borderColor: withAlpha(colors.foreground, 0.1),
    },
    artwork: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    nodeCopy: { flex: 1, minWidth: 0 },
    nodeTitle: { color: colors.cardForeground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    nodeCaption: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 3 },
    smallPlayButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    trackChildren: { marginRight: 42, borderRightWidth: 1, borderRightColor: colors.border, paddingRight: 10, gap: 6 },
    trackRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    trackContent: {
      flex: 1,
      minWidth: 0,
      minHeight: 47,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 12,
      borderRadius: 17,
      backgroundColor: withAlpha(colors.foreground, 0.04),
      borderWidth: 1,
      borderColor: withAlpha(colors.foreground, 0.08),
    },
    trackTitle: { flex: 1, color: colors.cardForeground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    branchEmpty: { color: colors.mutedForeground, fontSize: 12, lineHeight: 20, textAlign: 'right', padding: 9 },
    groupLabel: { color: colors.mutedForeground, fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 7 },
    unassignedBranch: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 12,
      gap: 7,
    },
    focusCard: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 13,
      padding: 15,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    focusCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    focusTitle: { color: colors.foreground, fontSize: 20, lineHeight: 27, fontWeight: '700', marginTop: 4, textAlign: 'right' },
    focusMeta: { color: colors.mutedForeground, fontSize: 12, marginTop: 5, textAlign: 'right' },
    focusActions: { gap: 8, marginTop: 11 },
    focusSecondaryActions: { flexDirection: 'row-reverse', gap: 8 },
    primaryAction: {
      flex: 1,
      minHeight: 45,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 15,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
    },
    primaryActionText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700' },
    secondaryAction: {
      flex: 1,
      minHeight: 45,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 15,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
    },
    secondaryActionText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    picker: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 15,
    },
    pickerHeading: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
    pickerHeadingCopy: { flex: 1, alignItems: 'flex-end' },
    pickerHint: { color: colors.mutedForeground, fontSize: 12, lineHeight: 20, textAlign: 'right', marginTop: 5 },
    pickerInputWrap: {
      minHeight: 48,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerInput: { flex: 1, color: colors.foreground, fontSize: 13, minHeight: 44 },
    pickerSectionLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: '700', textAlign: 'right', marginTop: 15, marginBottom: 7 },
    pickerResult: {
      minHeight: 54,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerResultCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    pickerResultTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    pickerResultMeta: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
    pickerEmpty: { color: colors.mutedForeground, fontSize: 12, textAlign: 'right', paddingVertical: 20 },
    backButton: {
      minHeight: 42,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 7,
      alignSelf: 'flex-start',
      paddingHorizontal: 11,
      marginTop: 10,
      borderRadius: 14,
      backgroundColor: withAlpha(colors.primary, 0.1),
    },
    backButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    relationFilterContent: { flexDirection: 'row-reverse', gap: 7, paddingVertical: 14 },
    relationFilterChip: {
      minHeight: 36,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    relationFilterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    relationFilterText: { color: colors.mutedForeground, fontSize: 11, fontWeight: '700' },
    relationFilterTextActive: { color: colors.primaryForeground },
    relationGroups: { gap: 15, marginTop: 18 },
    relationGroup: { gap: 8 },
    groupHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 3 },
    groupHeadingCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    groupTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', textAlign: 'right' },
    groupDescription: { color: colors.mutedForeground, fontSize: 10, lineHeight: 17, textAlign: 'right', marginTop: 3 },
    groupCount: {
      minWidth: 27,
      height: 27,
      borderRadius: 14,
      textAlign: 'center',
      textAlignVertical: 'center',
      color: colors.primary,
      backgroundColor: withAlpha(colors.primary, 0.12),
      fontSize: 12,
      fontWeight: '700',
      overflow: 'hidden',
    },
    relationCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 10,
    },
    relationRow: {
      minHeight: 65,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    relationContent: {
      flex: 1,
      minWidth: 0,
      minHeight: 58,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 4,
      borderRadius: 15,
    },
    relationCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    relationTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    relationMeta: { color: colors.mutedForeground, fontSize: 11, lineHeight: 18, marginTop: 3, textAlign: 'right' },
    showMoreButton: {
      minHeight: 40,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 13,
      backgroundColor: colors.secondary,
    },
    showMoreText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    noRelations: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 24,
      marginTop: 18,
    },
    noRelationsTitle: { color: colors.foreground, fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 11 },
    noRelationsText: { color: colors.mutedForeground, fontSize: 12, lineHeight: 21, textAlign: 'center', marginTop: 7 },
    toast: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 90,
      minHeight: 49,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
      elevation: 8,
    },
    toastText: { color: colors.foreground, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    pressed: { opacity: 0.72 },
  });
}