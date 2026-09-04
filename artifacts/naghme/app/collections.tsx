import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { MINI_PLAYER_CONTENT_PADDING, useMiniPlayerActive } from '@/hooks/useMiniPlayerActive';
import { CollectionRecord, createCollection, deleteCollection, getCollections } from '@/src/db/queries';

export default function CollectionsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const miniPlayerActive = useMiniPlayerActive();
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      setCollections(await getCollections());
      setError('');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن مجموعه‌ها انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadCollections(); }, [loadCollections]));

  const saveCollection = async () => {
    setSaving(true);
    try {
      const created = await createCollection({ title, description });
      setTitle('');
      setDescription('');
      setFormOpen(false);
      router.push(`/collection/${created.id}`);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ساخت مجموعه انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (collection: CollectionRecord) => {
    Alert.alert(
      'حذف مجموعه',
      `مجموعه‌ی «${collection.title}» حذف می‌شود؛ قطعه‌ها از آرشیو پاک نمی‌شوند و فقط از این مجموعه بیرون می‌روند.`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف مجموعه',
          style: 'destructive',
          onPress: () => {
            void deleteCollection(collection.id).then(loadCollections).catch((deleteError: unknown) => {
              setError(deleteError instanceof Error ? deleteError.message : 'حذف مجموعه انجام نشد.');
            });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="بازگشت">
          <Feather name="arrow-right" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>آرشیو شخصی</Text>
          <Text style={styles.title}>مجموعه‌ها</Text>
        </View>
        <Pressable onPress={() => setFormOpen((value) => !value)} style={styles.addButton} accessibilityLabel="ساخت مجموعه">
          <Feather name={formOpen ? 'x' : 'plus'} size={21} color={colors.primaryForeground} />
        </Pressable>
      </View>
      {formOpen ? (
        <View style={styles.form}>
          <TextInput value={title} onChangeText={setTitle} placeholder="مثلاً شب‌های بارانی" placeholderTextColor={colors.mutedForeground} style={styles.input} textAlign="right" autoFocus />
          <TextInput value={description} onChangeText={setDescription} placeholder="توضیح کوتاه (اختیاری)" placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.multiline]} textAlign="right" multiline />
          <Pressable onPress={() => void saveCollection()} style={styles.saveButton}>
            {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.saveButtonText}>ساخت مجموعه</Text>}
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, miniPlayerActive && { paddingBottom: 110 + MINI_PLAYER_CONTENT_PADDING }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Feather name="layers" size={28} color={colors.primary} /></View>
              <Text style={styles.emptyTitle}>هنوز مجموعه‌ای نداری</Text>
              <Text style={styles.emptyCopy}>قطعه‌هایت را برای حال‌وهوای خاص خودت کنار هم بچین.</Text>
              <Pressable onPress={() => setFormOpen(true)} style={styles.emptyButton}>
                <Feather name="plus" size={17} color={colors.primaryForeground} />
                <Text style={styles.emptyButtonText}>ساخت اولین مجموعه</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => router.push(`/collection/${item.id}`)} style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}>
                <View style={styles.cover}>
                  {item.coverImage ? <Image source={{ uri: item.coverImage }} style={styles.coverImage} /> : <Feather name="layers" size={25} color={colors.primary} />}
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardMeta}>{item.trackCount} قطعه  •  {formatDuration(item.totalDuration)}</Text>
                  {item.description ? <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text> : null}
                </View>
              </Pressable>
              <View style={styles.cardActions}>
                <Pressable onPress={() => confirmDelete(item)} accessibilityLabel={`حذف ${item.title}`} style={styles.iconButton}>
                  <Feather name="trash-2" size={17} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function formatDuration(seconds: number) {
  if (!seconds) return 'مدت نامشخص';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 54 },
    header: { minHeight: 58, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    headerCopy: { flex: 1, alignItems: 'flex-end', marginHorizontal: 12 },
    eyebrow: { color: colors.mutedForeground, fontSize: 12, marginBottom: 3 },
    title: { color: colors.foreground, fontSize: 30, fontWeight: '700' },
    headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    addButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    form: { gap: 9, padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
    input: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground, paddingHorizontal: 13 },
    multiline: { minHeight: 72, paddingTop: 12 },
    saveButton: { minHeight: 44, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    saveButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    error: { color: colors.destructive, textAlign: 'right', lineHeight: 21, marginBottom: 12 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
    list: { paddingBottom: 24 },
    card: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 12, marginBottom: 10 },
    cardMain: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    cover: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    coverImage: { width: '100%', height: '100%' },
    cardCopy: { flex: 1, alignItems: 'flex-end' },
    cardTitle: { color: colors.cardForeground, fontSize: 15, fontWeight: '700' },
    cardMeta: { color: colors.primary, fontSize: 11, marginTop: 5 },
    cardDescription: { color: colors.mutedForeground, fontSize: 11, lineHeight: 18, textAlign: 'right', marginTop: 5 },
    cardActions: { marginRight: 8 },
    iconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 24 },
    emptyIcon: { width: 72, height: 72, borderRadius: 25, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    emptyTitle: { color: colors.foreground, fontSize: 19, fontWeight: '700', marginBottom: 8 },
    emptyCopy: { color: colors.mutedForeground, fontSize: 13, lineHeight: 22, textAlign: 'center', marginBottom: 18 },
    emptyButton: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 16 },
    emptyButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    pressed: { opacity: 0.72 },
  });
}