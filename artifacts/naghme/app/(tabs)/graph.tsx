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
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { MINI_PLAYER_CONTENT_PADDING, useMiniPlayerActive } from '@/hooks/useMiniPlayerActive';
import { playTracksInQueue } from '@/src/audio/audioManager';
import { TrackRecord } from '@/src/db/queries';
import {
  getMusicGraphData,
  MusicGraphData,
  MusicGraphEdge,
  MusicGraphEdgeType,
  MusicGraphNode,
  MusicGraphNodeType,
} from '@/src/graph/musicGraph';
import { withAlpha } from '@/src/player/coverColors';

type GraphFilter = 'all' | 'credit' | 'artist-artist' | 'structure';
type PositionedNode = MusicGraphNode & { x: number; y: number; isFocus: boolean };
type GraphQueueTrack = TrackRecord & { artistName: string | null };

const FILTERS: Array<{ value: GraphFilter; label: string; icon: 'layers' | 'users' | 'award' | 'git-branch' }> = [
  { value: 'all', label: 'همه', icon: 'layers' },
  { value: 'credit', label: 'مشارکت‌ها', icon: 'award' },
  { value: 'artist-artist', label: 'روابط هنرمندان', icon: 'users' },
  { value: 'structure', label: 'ساختار موسیقی', icon: 'git-branch' },
];

const NODE_LIMIT = 12;

export default function GraphScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const { width } = useWindowDimensions();
  const { focusId } = useLocalSearchParams<{ focusId?: string | string[] }>();
  const [data, setData] = useState<MusicGraphData | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [filter, setFilter] = useState<GraphFilter>('all');
  const [neighborLimit, setNeighborLimit] = useState<number>(NODE_LIMIT);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const graph = await getMusicGraphData();
      setData(graph);
      const requestedFocusId = Array.isArray(focusId) ? focusId[0] : focusId;
      setFocusedNodeId((current) => requestedFocusId && graph.nodes.some((node) => node.id === requestedFocusId)
        ? requestedFocusId
        : current && graph.nodes.some((node) => node.id === current) ? current : chooseStartNode(graph));
      setHistory([]);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن نقشه انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [focusId]);

  useFocusEffect(useCallback(() => {
    void loadGraph();
  }, [loadGraph]));

  const nodeMap = useMemo(
    () => new Map((data?.nodes ?? []).map((node) => [node.id, node])),
    [data],
  );
  const focusedNode = focusedNodeId ? nodeMap.get(focusedNodeId) ?? null : null;
  const allowedEdgeTypes = useMemo(() => getAllowedEdgeTypes(filter), [filter]);
  const visibleEdges = useMemo(
    () => getFocusedEdges(data?.edges ?? [], focusedNodeId, allowedEdgeTypes),
    [allowedEdgeTypes, data?.edges, focusedNodeId],
  );
  const neighborIds = useMemo(() => {
    const ids: string[] = [];
    visibleEdges.forEach((edge) => {
      const neighborId = edge.from === focusedNodeId ? edge.to : edge.from;
      if (!ids.includes(neighborId)) ids.push(neighborId);
    });
    return ids;
  }, [focusedNodeId, visibleEdges]);
  const displayedNeighborIds = neighborIds.slice(0, neighborLimit);
  const canvasWidth = Math.max(320, Math.min(width - 40, 620));
  const positionedNodes = useMemo(
    () => getPositions(focusedNode, displayedNeighborIds.map((id) => nodeMap.get(id)).filter(isNode), canvasWidth),
    [canvasWidth, displayedNeighborIds, focusedNode],
  );
  const positionedMap = useMemo(
    () => new Map(positionedNodes.map((node) => [node.id, node])),
    [positionedNodes],
  );
  const renderedEdges = visibleEdges.filter((edge) => positionedMap.has(edge.from) && positionedMap.has(edge.to));

  const focusNode = (node: MusicGraphNode) => {
    if (node.id === focusedNodeId) return;
    if (focusedNodeId) setHistory((current) => [...current, focusedNodeId]);
    setFocusedNodeId(node.id);
    setNeighborLimit(NODE_LIMIT);
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setFocusedNodeId(previous);
    setNeighborLimit(NODE_LIMIT);
  };

  const playFocusedNode = async () => {
    if (!data || !focusedNode) return;
    const tracks = getQueueForNode(focusedNode, data, nodeMap);
    if (!tracks.length) {
      setToast('برای این گره قطعه‌ی قابل پخشی پیدا نشد.');
      return;
    }
    setToast('صف پخش گراف آماده شد.');
    const started = await playTracksInQueue(tracks, 0);
    if (started) router.push('/player');
    else setToast('پخش قطعه‌های این گره ممکن نیست.');
  };

  const openDetails = () => {
    if (!focusedNode) return;
    const path = routeForNode(focusedNode);
    if (path) router.push(path);
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
          <View style={styles.headerIcon}><Feather name="git-branch" size={21} color={colors.primary} /></View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ارتباط‌های آرشیو</Text>
            <Text style={styles.title}>نقشه‌ی موسیقی</Text>
          </View>
        </View>
        <Text style={styles.intro}>
          هر گره را انتخاب کن تا همسایه‌های واقعی آن را ببینی؛ این نقشه فقط یک محله‌ی کوچک از آرشیو را رسم می‌کند.
        </Text>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {FILTERS.map((item) => (
              <Pressable
                key={item.value}
                testID={`graph-filter-${item.value}`}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === item.value }}
                onPress={() => setFilter(item.value)}
                style={({ pressed }) => [
                  styles.filterChip,
                  filter === item.value && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Feather name={item.icon} size={14} color={filter === item.value ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.status}><ActivityIndicator color={colors.primary} /></View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={17} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : !data?.nodes.length ? (
          <View style={styles.emptyState}>
            <Feather name="git-branch" size={28} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>نقشه هنوز خالی است</Text>
            <Text style={styles.emptyText}>از صفحه‌ی خانه داده‌های آزمایشی را تزریق کن.</Text>
          </View>
        ) : focusedNode ? (
          <>
            <View style={styles.focusCard}>
              <View style={styles.focusCopy}>
                <Text style={styles.focusEyebrow}>گره کانونی</Text>
                <Text style={styles.focusTitle} numberOfLines={1}>{focusedNode.label}</Text>
                <Text style={styles.focusMeta}>{nodeTypeLabel(focusedNode.type)} · {neighborIds.length} همسایه</Text>
              </View>
              <View style={styles.focusActions}>
                {history.length ? (
                  <Pressable testID="graph-back" accessibilityRole="button" accessibilityLabel="بازگشت به گره قبلی" onPress={goBack} style={styles.iconButton}>
                    <Feather name="arrow-right" size={18} color={colors.foreground} />
                  </Pressable>
                ) : null}
                <Pressable testID="graph-open-details" accessibilityRole="button" accessibilityLabel="باز کردن جزئیات گره" onPress={openDetails} style={styles.iconButton}>
                  <Feather name="external-link" size={17} color={colors.foreground} />
                </Pressable>
              </View>
            </View>

            <View style={styles.legend}>
              <LegendShape type="artist" label="هنرمند" colors={colors} />
              <LegendShape type="album" label="آلبوم" colors={colors} />
              <LegendShape type="track" label="قطعه" colors={colors} />
              <LegendShape type="work" label="اثر" colors={colors} />
              <LegendShape type="version" label="نسخه" colors={colors} />
            </View>

            <View style={styles.graphCard}>
              {positionedNodes.length > 1 ? (
                <View style={[styles.canvas, { width: canvasWidth, height: 360 }]}>
                  <Svg width={canvasWidth} height={360}>
                    {renderedEdges.map((edge) => {
                      const from = positionedMap.get(edge.from);
                      const to = positionedMap.get(edge.to);
                      if (!from || !to) return null;
                      return (
                        <SvgGraphEdge key={edge.id} edge={edge} from={from} to={to} colors={colors} />
                      );
                    })}
                    {positionedNodes.map((node) => <SvgGraphNode key={node.id} node={node} colors={colors} />)}
                  </Svg>
                  <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                    {positionedNodes.map((node) => (
                      <Pressable
                        key={node.id}
                        testID={`graph-node-${node.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`تمرکز روی ${node.label}`}
                        onPress={() => focusNode(node)}
                        onLongPress={node.type === 'track' || node.type === 'album' || node.type === 'artist' ? () => void playNode(node, data, nodeMap, setToast) : undefined}
                        style={[styles.nodeHit, { left: node.x - 54, top: node.y - 42 }]}
                      >
                        <Text style={styles.nodeHitLabel} numberOfLines={2}>{node.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.noNeighbors}>
                  <Feather name="git-branch" size={25} color={colors.mutedForeground} />
                  <Text style={styles.noNeighborsTitle}>همسایه‌ای با این فیلتر پیدا نشد</Text>
                  <Text style={styles.noNeighborsText}>فیلتر دیگری را امتحان کن یا از جزئیات همین گره یک رابطه بساز.</Text>
                </View>
              )}
              <View style={styles.graphHint}>
                <Feather name="info" size={14} color={colors.mutedForeground} />
                <Text style={styles.graphHintText}>با لمس گره تمرکز جابه‌جا می‌شود؛ با لمس طولانی قطعه یا آلبوم صف پخش شروع می‌شود.</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable testID="graph-play-focused" onPress={() => void playFocusedNode()} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
                <Feather name="play" size={17} color={colors.primaryForeground} />
                <Text style={styles.primaryActionText}>پخش صف این گره</Text>
              </Pressable>
              {neighborIds.length > displayedNeighborIds.length ? (
                <Pressable testID="graph-show-more" onPress={() => setNeighborLimit((current) => current + NODE_LIMIT)} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
                  <Feather name="plus" size={16} color={colors.primary} />
                  <Text style={styles.secondaryActionText}>نمایش بیشتر</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
      {toast ? <GraphToast message={toast} colors={colors} styles={styles} /> : null}
    </SafeAreaView>
  );
}

function SvgGraphEdge({
  edge,
  from,
  to,
  colors,
}: {
  edge: MusicGraphEdge;
  from: PositionedNode;
  to: PositionedNode;
  colors: ReturnType<typeof useColors>;
}) {
  const color = edge.type === 'credit'
    ? colors.primary
    : edge.type === 'artist-artist'
      ? colors.destructive
      : colors.border;
  return (
    <>
      <Line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth={edge.type === 'credit' ? 2 : 1.4}
        strokeDasharray={edge.type === 'artist-artist' ? '5 4' : undefined}
        opacity={0.85}
      />
      {edge.label ? (
        <SvgText
          x={(from.x + to.x) / 2}
          y={(from.y + to.y) / 2 - 6}
          fill={colors.mutedForeground}
          fontSize="9"
          textAnchor="middle"
        >
          {edge.label}
        </SvgText>
      ) : null}
    </>
  );
}

function SvgGraphNode({ node, colors }: { node: PositionedNode; colors: ReturnType<typeof useColors> }) {
  const fill = nodeColor(node.type, colors);
  if (node.type === 'album' || node.type === 'work') {
    return (
      <Rect
        x={node.x - (node.isFocus ? 25 : 19)}
        y={node.y - (node.isFocus ? 25 : 19)}
        width={node.isFocus ? 50 : 38}
        height={node.isFocus ? 50 : 38}
        rx={node.type === 'work' ? 13 : 9}
        fill={fill}
        stroke={colors.background}
        strokeWidth={3}
      />
    );
  }
  return (
    <Circle
      cx={node.x}
      cy={node.y}
      r={node.isFocus ? 27 : node.type === 'track' ? 17 : 21}
      fill={fill}
      stroke={colors.background}
      strokeWidth={3}
    />
  );
}

function LegendShape({
  type,
  label,
  colors,
}: {
  type: MusicGraphNodeType;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={stylesForLegend.item}>
      <View style={[stylesForLegend.shape, { backgroundColor: nodeColor(type, colors), borderRadius: type === 'album' || type === 'work' ? 5 : 20 }]} />
      <Text style={[stylesForLegend.label, { color: colors.mutedForeground }]}>{label}</Text>
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
  return (
    <View pointerEvents="none" style={styles.toast}>
      <Feather name="play-circle" size={17} color={colors.primary} />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

function getAllowedEdgeTypes(filter: GraphFilter): Set<MusicGraphEdgeType> {
  if (filter === 'all') return new Set<MusicGraphEdgeType>([
    'artist-album', 'artist-track', 'album-track', 'work-version', 'track-work',
    'track-version', 'credit', 'artist-artist',
  ]);
  if (filter === 'credit') return new Set<MusicGraphEdgeType>(['credit']);
  if (filter === 'artist-artist') return new Set<MusicGraphEdgeType>(['artist-artist']);
  return new Set<MusicGraphEdgeType>([
    'artist-album', 'artist-track', 'album-track', 'work-version', 'track-work', 'track-version',
  ]);
}

function getFocusedEdges(
  edges: MusicGraphEdge[],
  focusedNodeId: string | null,
  allowed: Set<MusicGraphEdgeType>,
): MusicGraphEdge[] {
  if (!focusedNodeId) return [];
  return edges.filter((edge) => allowed.has(edge.type) && (edge.from === focusedNodeId || edge.to === focusedNodeId));
}

function getPositions(
  focus: MusicGraphNode | null,
  neighbors: MusicGraphNode[],
  width: number,
): PositionedNode[] {
  if (!focus) return [];
  const center = { x: width / 2, y: 178 };
  const radiusX = Math.max(104, width * 0.36);
  const radiusY = 125;
  return [
    { ...focus, ...center, isFocus: true },
    ...neighbors.map((node, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, neighbors.length)) * Math.PI * 2;
      return {
        ...node,
        x: center.x + Math.cos(angle) * radiusX,
        y: center.y + Math.sin(angle) * radiusY,
        isFocus: false,
      };
    }),
  ];
}

function chooseStartNode(data: MusicGraphData): string | null {
  const degree = new Map<string, number>();
  data.edges.forEach((edge) => {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  });
  return [...data.nodes]
    .sort((left, right) => {
      const typeWeight = (right.type === 'artist' ? 1 : 0) - (left.type === 'artist' ? 1 : 0);
      return typeWeight || (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0);
    })[0]?.id ?? null;
}

function getQueueForNode(
  node: MusicGraphNode,
  data: MusicGraphData,
  nodeMap: Map<string, MusicGraphNode>,
): GraphQueueTrack[] {
  const trackIds: string[] = [];
  const addTrack = (id: string) => {
    const candidate = nodeMap.get(id);
    if (candidate?.type === 'track' && candidate.audioUri && !trackIds.includes(id)) trackIds.push(id);
  };
  const addAlbumTracks = (albumId: string) => {
    data.edges
      .filter((edge) => edge.type === 'album-track' && edge.from === albumId)
      .forEach((edge) => addTrack(edge.to));
  };

  if (node.type === 'track') {
    const albumEdge = data.edges.find((edge) => edge.type === 'album-track' && edge.to === node.id);
    if (albumEdge) addAlbumTracks(albumEdge.from);
    else if (node.albumId) addAlbumTracks(node.albumId);
    else {
      const artistEdge = data.edges.find((edge) => edge.type === 'artist-track' && edge.to === node.id);
      if (artistEdge) {
        data.edges
          .filter(
            (edge) =>
              edge.type === 'artist-track' &&
              edge.from === artistEdge.from &&
              !data.edges.some(
                (albumTrackEdge) =>
                  albumTrackEdge.type === 'album-track' && albumTrackEdge.to === edge.to,
              ),
          )
          .forEach((edge) => addTrack(edge.to));
      }
    }
    if (!trackIds.length) addTrack(node.id);
  } else if (node.type === 'album') {
    addAlbumTracks(node.id);
  } else {
    data.edges
      .filter((edge) => edge.from === node.id || edge.to === node.id)
      .forEach((edge) => {
        if (edge.type === 'artist-track' && edge.from === node.id) addTrack(edge.to);
        if (edge.type === 'credit') addTrack(edge.to);
        if (edge.type === 'artist-album' && edge.from === node.id) addAlbumTracks(edge.to);
        if (edge.type === 'track-work' && edge.to === node.id) addTrack(edge.from);
        if (edge.type === 'track-version' && edge.to === node.id) addTrack(edge.from);
      });
  }
  return trackIds.map((id) => toTrackRecord(nodeMap.get(id)!));
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

async function playNode(
  node: MusicGraphNode,
  data: MusicGraphData,
  nodeMap: Map<string, MusicGraphNode>,
  setToast: (value: string) => void,
) {
  const tracks = getQueueForNode(node, data, nodeMap);
  if (!tracks.length) {
    setToast('فایل قابل پخشی برای این گره پیدا نشد.');
    return;
  }
  const started = await playTracksInQueue(tracks, 0);
  setToast(started ? 'صف پخش گراف شروع شد.' : 'پخش از گراف انجام نشد.');
  if (started) router.push('/player');
}

function routeForNode(node: MusicGraphNode): `/artist/${string}` | `/album/${string}` | `/track/${string}` | `/work/${string}` | null {
  if (node.type === 'artist') return `/artist/${node.id}`;
  if (node.type === 'album') return `/album/${node.id}`;
  if (node.type === 'track') return `/track/${node.id}`;
  if (node.type === 'work') return `/work/${node.id}`;
  return null;
}

function nodeTypeLabel(type: MusicGraphNodeType): string {
  return { artist: 'هنرمند', album: 'آلبوم', track: 'قطعه', work: 'اثر', version: 'نسخه' }[type];
}

function nodeColor(type: MusicGraphNodeType, colors: ReturnType<typeof useColors>): string {
  return {
    artist: colors.primary,
    album: colors.accent,
    track: colors.secondaryForeground,
    work: colors.destructive,
    version: colors.mutedForeground,
  }[type];
}

function isNode(node: MusicGraphNode | undefined): node is MusicGraphNode {
  return Boolean(node);
}

const stylesForLegend = StyleSheet.create({
  item: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  shape: { width: 10, height: 10 },
  label: { fontSize: 10 },
});

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 104 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13, marginBottom: 15 },
    headerIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    headerCopy: { flex: 1, alignItems: 'flex-end' },
    eyebrow: { color: colors.mutedForeground, fontSize: 13, marginBottom: 4, textAlign: 'right' },
    title: { color: colors.foreground, fontSize: 30, lineHeight: 38, fontWeight: '700', textAlign: 'right' },
    intro: { color: colors.mutedForeground, fontSize: 13, lineHeight: 23, textAlign: 'right', marginBottom: 16 },
    filterRow: { marginHorizontal: -20, marginBottom: 14 },
    filterContent: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 20 },
    filterChip: { minHeight: 35, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { color: colors.mutedForeground, fontSize: 11, fontWeight: '700' },
    filterTextActive: { color: colors.primaryForeground },
    status: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
    errorBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: colors.muted, borderRadius: 15, padding: 13 },
    errorText: { flex: 1, color: colors.destructive, fontSize: 13, lineHeight: 21, textAlign: 'right' },
    emptyState: { minHeight: 360, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 24 },
    emptyTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 13, textAlign: 'center' },
    emptyText: { color: colors.mutedForeground, fontSize: 13, lineHeight: 22, marginTop: 8, textAlign: 'center' },
    focusCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
    focusCopy: { flex: 1, alignItems: 'flex-end' },
    focusEyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'right' },
    focusTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 4, textAlign: 'right' },
    focusMeta: { color: colors.mutedForeground, fontSize: 11, marginTop: 4, textAlign: 'right' },
    focusActions: { flexDirection: 'row', gap: 4 },
    iconButton: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
    legend: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 10 },
    graphCard: { overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, paddingTop: 8 },
    canvas: { alignSelf: 'center' },
    nodeHit: { position: 'absolute', width: 108, minHeight: 68, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 6 },
    nodeHitLabel: { color: colors.foreground, fontSize: 11, fontWeight: '700', textAlign: 'center', textShadowColor: colors.background, textShadowRadius: 4 },
    noNeighbors: { height: 300, alignItems: 'center', justifyContent: 'center', padding: 20 },
    noNeighborsTitle: { color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 12, textAlign: 'center' },
    noNeighborsText: { color: colors.mutedForeground, fontSize: 12, lineHeight: 21, marginTop: 7, textAlign: 'center' },
    graphHint: { flexDirection: 'row-reverse', gap: 7, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
    graphHintText: { flex: 1, color: colors.mutedForeground, fontSize: 10, lineHeight: 17, textAlign: 'right' },
    actionRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 },
    primaryAction: { flex: 1, minHeight: 45, flexDirection: 'row-reverse', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.primary },
    primaryActionText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700' },
    secondaryAction: { minHeight: 45, flexDirection: 'row-reverse', gap: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 15, backgroundColor: colors.secondary },
    secondaryActionText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    toast: { position: 'absolute', left: 20, right: 20, bottom: 90, minHeight: 49, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, elevation: 8 },
    toastText: { color: colors.foreground, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    pressed: { opacity: 0.72 },
  });
}