import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CollectionPicker } from '@/components/CollectionPicker';
import { useColors } from '@/hooks/useColors';
import { MINI_PLAYER_CONTENT_PADDING, useMiniPlayerActive } from '@/hooks/useMiniPlayerActive';
import { playTracksInQueue } from '@/src/audio/audioManager';
import {
  CollectionRecord,
  CollectionTrackRecord,
  deleteCollection,
  getCollectionById,
  getCollectionTracks,
  moveCollectionTrack,
  removeTrackFromCollection,
  updateCollection,
} from '@/src/db/queries';

export default function CollectionDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const collectionId = Array.isArray(id) ? id[0] : id;
  const [collection, setCollection] = useState<CollectionRecord | null>(null);
  const [tracks, setTracks] = useState<CollectionTrackRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editing, setEditing] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [pickerTrackId, setPickerTrackId] = useState<string | null>(null);

  const loadCollection = useCallback(async () => {
    if (!collectionId) return;
    setLoading(true);
    try {
      const [nextCollection, nextTracks] = await Promise.all([
        getCollectionById(collectionId),
        getCollectionTracks(collectionId),
      ]);
      setCollection(nextCollection);
      setTracks(nextTracks);
      if (nextCollection) {
        setTitle(nextCollection.title);
        setDescription(nextCollection.description ?? '');
      }
      setError(nextCollection ? '' : 'مجموعه پیدا نشد.');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن مجموعه انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useFocusEffect(useCallback(() => { void loadCollection(); }, [loadCollection]));

  const saveEdits = async () => {
    if (!collection) return;
    try {
      const saved = await updateCollection(collection.id, { title, description });
      setCollection({ ...saved, trackCount: tracks.length, totalDuration: tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0) });
      setEditing(false);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ویرایش مجموعه انجام نشد.');
    }
  };

  const pickCover = async () => {
    if (!collection) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    try {
      const saved = await updateCollection(collection.id, { coverImage: result.assets[0].uri });
      setCollection({ ...saved, trackCount: tracks.length, totalDuration: tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0) });
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی جلد انجام نشد.');
    }
  };

  const playAll = () => {
    const playable = tracks.filter((track) => track.audioUri);
    if (!playable.length) {
      Alert.alert('فایل صوتی پیدا نشد', 'قطعه‌های بدون فایل صوتی در فهرست می‌مانند اما پخش نمی‌شوند.');
      return;
    }
    void playTracksInQueue(tracks, 0);
  };

  const playFrom = (index: number) => {
    void playTracksInQueue(tracks, index);
  };

  const confirmRemove = (track: CollectionTrackRecord) => {
    Alert.alert('حذف از مجموعه', `«${track.title}» از این مجموعه بیرون برود؟ خود قطعه در آرشیو می‌ماند.`, [
      { text: 'لغو', style: 'cancel' },
      {
        text: 'حذف از مجموعه',
        style: 'destructive',
        onPress: () => void removeTrackFromCollection(collectionId, track.id).then(loadCollection).catch((removeError: unknown) => setError(removeError instanceof Error ? removeError.message : 'حذف از مجموعه انجام نشد.')),
      },
    ]);
  };

  const confirmDelete = () => {
    if (!collection) return;
    Alert.alert('حذف مجموعه', `«${collection.title}» حذف شود؟ قطعه‌ها از آرشیو پاک نمی‌شوند و فقط عضویت‌هایشان از بین می‌رود.`, [
      { text: 'لغو', style: 'cancel' },
      {
        text: 'حذف مجموعه',
        style: 'destructive',
        onPress: () => void deleteCollection(collection.id).then(() => router.back()).catch((deleteError: unknown) => setError(deleteError instanceof Error ? deleteError.message : 'حذف مجموعه انجام نشد.')),
      },
    ]);
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!collection) {
    return <View style={styles.screen}><Text style={styles.error}>{error || 'این مجموعه دیگر در آرشیو نیست.'}</Text></View>;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, miniPlayerActive && { paddingBottom: 110 + MINI_PLAYER_CONTENT_PADDING }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="بازگشت"><Feather name="arrow-right" size={20} color={colors.foreground} /></Pressable>
          <View style={styles.headerActions}>
            <Pressable onPress={confirmDelete} style={styles.headerButton} accessibilityLabel="حذف مجموعه"><Feather name="trash-2" size={18} color={colors.destructive} /></Pressable>
            <Pressable onPress={() => setEditing((value) => !value)} style={styles.headerButton} accessibilityLabel="ویرایش مجموعه"><Feather name={editing ? 'x' : 'edit-2'} size={18} color={colors.foreground} /></Pressable>
          </View>
        </View>
        <View style={styles.hero}>
          <Pressable onPress={() => void pickCover()} style={styles.cover} accessibilityLabel="تغییر جلد مجموعه">
            {collection.coverImage ? <Image source={{ uri: collection.coverImage }} style={styles.coverImage} /> : <Feather name="layers" size={38} color={colors.primary} />}
            <View style={styles.coverBadge}><Feather name="camera" size={13} color={colors.primaryForeground} /></View>
          </Pressable>
          {editing ? (
            <View style={styles.editForm}>
              <TextInput value={title} onChangeText={setTitle} style={styles.input} textAlign="right" placeholder="عنوان مجموعه" placeholderTextColor={colors.mutedForeground} />
              <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.multiline]} textAlign="right" multiline placeholder="توضیح کوتاه" placeholderTextColor={colors.mutedForeground} />
              <Pressable onPress={() => void saveEdits()} style={styles.saveButton}><Text style={styles.saveButtonText}>ذخیره‌ی تغییرات</Text></Pressable>
            </View>
          ) : (
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>مجموعه‌ی شخصی</Text>
              <Text style={styles.title}>{collection.title}</Text>
              <Text style={styles.meta}>{tracks.length} قطعه  •  {formatDuration(tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0))}</Text>
              {collection.description ? <Text style={styles.description}>{collection.description}</Text> : null}
            </View>
          )}
        </View>
        <Pressable onPress={playAll} style={styles.playAllButton}>
          <Feather name="play" size={18} color={colors.primaryForeground} />
          <Text style={styles.playAllText}>پخش کل مجموعه</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>قطعه‌ها</Text>
          <Text style={styles.sectionCount}>{tracks.length} قطعه</Text>
        </View>
        {tracks.length ? tracks.map((track, index) => (
          <View key={track.id} style={styles.trackRow}>
            <View style={styles.rowActions}>
              <Pressable onPress={() => void moveCollectionTrack(collection.id, track.id, 'down').then(loadCollection)} disabled={index === tracks.length - 1} style={styles.smallAction} accessibilityLabel="پایین‌تر"><Feather name="chevron-down" size={17} color={index === tracks.length - 1 ? colors.border : colors.mutedForeground} /></Pressable>
              <Pressable onPress={() => void moveCollectionTrack(collection.id, track.id, 'up').then(loadCollection)} disabled={index === 0} style={styles.smallAction} accessibilityLabel="بالاتر"><Feather name="chevron-up" size={17} color={index === 0 ? colors.border : colors.mutedForeground} /></Pressable>
              <Pressable onPress={() => confirmRemove(track)} style={styles.smallAction} accessibilityLabel="حذف از مجموعه"><Feather name="x" size={16} color={colors.destructive} /></Pressable>
            </View>
            <Pressable onPress={() => router.push(`/track/${track.id}`)} style={({ pressed }) => [styles.trackMain, pressed && styles.pressed]}>
              <View style={styles.trackCover}>{track.coverImage ? <Image source={{ uri: track.coverImage }} style={styles.trackImage} /> : <Feather name="music" size={18} color={colors.primary} />}</View>
              <View style={styles.trackCopy}><Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text><Text style={styles.trackArtist} numberOfLines={1}>{track.artistName ?? 'هنرمند نامشخص'}{track.duration ? `  •  ${formatDuration(track.duration)}` : ''}</Text></View>
            </Pressable>
            {track.audioUri ? <Pressable onPress={() => playFrom(index)} style={styles.playButton} accessibilityLabel={`پخش ${track.title}`}><Feather name="play" size={14} color={colors.primaryForeground} /></Pressable> : null}
          </View>
        )) : <View style={styles.empty}><Feather name="music" size={25} color={colors.primary} /><Text style={styles.emptyText}>هنوز قطعه‌ای در این مجموعه نیست.</Text><Text style={styles.emptySubtext}>از صفحه‌ی هر قطعه، گزینه‌ی افزودن به مجموعه را بزن.</Text></View>}
      </ScrollView>
      <CollectionPicker trackId={pickerTrackId} visible={pickerTrackId !== null} onClose={() => setPickerTrackId(null)} onChanged={loadCollection} />
    </View>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return 'مدت نامشخص';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 48 },
    content: { paddingBottom: 24 },
    loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    header: { minHeight: 46, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerActions: { flexDirection: 'row-reverse', gap: 8 },
    headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    hero: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15, marginBottom: 18 },
    cover: { width: 128, height: 128, borderRadius: 27, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    coverImage: { width: '100%', height: '100%' },
    coverBadge: { position: 'absolute', bottom: 8, left: 8, width: 27, height: 27, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    heroCopy: { flex: 1, alignItems: 'flex-end' },
    eyebrow: { color: colors.mutedForeground, fontSize: 11, marginBottom: 4 },
    title: { color: colors.foreground, fontSize: 26, lineHeight: 34, fontWeight: '700', textAlign: 'right' },
    meta: { color: colors.primary, fontSize: 12, marginTop: 7 },
    description: { color: colors.mutedForeground, fontSize: 12, lineHeight: 20, textAlign: 'right', marginTop: 8 },
    editForm: { flex: 1, gap: 8 },
    input: { minHeight: 44, color: colors.foreground, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 12 },
    multiline: { minHeight: 70, paddingTop: 11 },
    saveButton: { minHeight: 42, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    saveButtonText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700' },
    playAllButton: { minHeight: 48, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, backgroundColor: colors.primary, marginBottom: 22 },
    playAllText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '700' },
    error: { color: colors.destructive, textAlign: 'right', lineHeight: 21, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { color: colors.foreground, fontSize: 19, fontWeight: '700' },
    sectionCount: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    trackRow: { minHeight: 76, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    trackMain: { flex: 1, minWidth: 0, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    trackCover: { width: 53, height: 53, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    trackImage: { width: '100%', height: '100%' },
    trackCopy: { flex: 1, alignItems: 'flex-end' },
    trackTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
    trackArtist: { color: colors.mutedForeground, fontSize: 11, marginTop: 4 },
    rowActions: { flexDirection: 'row', gap: 0 },
    smallAction: { width: 26, height: 29, alignItems: 'center', justifyContent: 'center' },
    playButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingVertical: 58, gap: 8 },
    emptyText: { color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 5 },
    emptySubtext: { color: colors.mutedForeground, fontSize: 12, textAlign: 'center' },
    pressed: { opacity: 0.72 },
  });
}