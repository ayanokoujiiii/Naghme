import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import {
  addTrackToCollection,
  CollectionRecord,
  createCollection,
  getCollections,
} from '@/src/db/queries';

interface CollectionPickerProps {
  trackId: string | null;
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export function CollectionPicker({ trackId, visible, onClose, onChanged }: CollectionPickerProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [newCollectionOpen, setNewCollectionOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!visible) return;
    setMessage('');
    setNewCollectionOpen(false);
    setLoading(true);
    void getCollections()
      .then(setCollections)
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : 'خواندن مجموعه‌ها انجام نشد.');
      })
      .finally(() => setLoading(false));
  }, [visible]);

  const addToCollection = async (collectionId: string) => {
    if (!trackId || saving) return;
    setSaving(true);
    setMessage('');
    try {
      await addTrackToCollection(collectionId, trackId);
      onChanged?.();
      onClose();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'افزودن قطعه انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const saveNewCollection = async () => {
    if (saving) return;
    setSaving(true);
    setMessage('');
    try {
      const created = await createCollection({ title, description });
      setCollections((current) => [created, ...current]);
      setTitle('');
      setDescription('');
      setNewCollectionOpen(false);
      if (trackId) await addTrackToCollection(created.id, trackId);
      onChanged?.();
      onClose();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'ساخت مجموعه انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} accessibilityLabel="بستن انتخاب مجموعه">
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>ذخیره برای بعد</Text>
              <Text style={styles.title}>افزودن به مجموعه</Text>
            </View>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {loading ? (
            <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
          ) : newCollectionOpen ? (
            <View style={styles.form}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="نام مجموعه"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
                textAlign="right"
                autoFocus
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="توضیح کوتاه (اختیاری)"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, styles.multiline]}
                textAlign="right"
                multiline
              />
              <View style={styles.formActions}>
                <Pressable onPress={() => setNewCollectionOpen(false)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>لغو</Text>
                </Pressable>
                <Pressable onPress={() => void saveNewCollection()} style={styles.primaryButton}>
                  {saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.primaryButtonText}>ساخت و افزودن</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Pressable onPress={() => setNewCollectionOpen(true)} style={styles.createButton}>
                <Feather name="plus" size={18} color={colors.primary} />
                <Text style={styles.createButtonText}>ساخت مجموعه‌ی تازه</Text>
              </Pressable>
              {collections.length ? collections.map((collection) => (
                <Pressable
                  key={collection.id}
                  onPress={() => void addToCollection(collection.id)}
                  style={({ pressed }) => [styles.collectionRow, pressed && styles.pressed]}
                >
                  <View style={styles.collectionIcon}>
                    {collection.coverImage ? <Image source={{ uri: collection.coverImage }} style={styles.cover} /> : <Feather name="layers" size={19} color={colors.primary} />}
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{collection.title}</Text>
                    <Text style={styles.rowMeta}>{collection.trackCount} قطعه</Text>
                  </View>
                  <Feather name="plus-circle" size={20} color={colors.primary} />
                </Pressable>
              )) : (
                <View style={styles.empty}><Text style={styles.emptyText}>هنوز مجموعه‌ای نساخته‌ای.</Text></View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32, maxHeight: '82%' },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
    headerCopy: { alignItems: 'flex-end' },
    eyebrow: { color: colors.mutedForeground, fontSize: 11, marginBottom: 3 },
    title: { color: colors.foreground, fontSize: 22, fontWeight: '700' },
    message: { color: colors.destructive, textAlign: 'right', lineHeight: 21, marginBottom: 12 },
    loading: { minHeight: 150, alignItems: 'center', justifyContent: 'center' },
    createButton: { minHeight: 48, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, backgroundColor: colors.accent, marginBottom: 12 },
    createButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    collectionRow: { minHeight: 68, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, padding: 10, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
    collectionIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.secondary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    cover: { width: '100%', height: '100%' },
    rowCopy: { flex: 1, alignItems: 'flex-end' },
    rowTitle: { color: colors.cardForeground, fontSize: 14, fontWeight: '700' },
    rowMeta: { color: colors.mutedForeground, fontSize: 11, marginTop: 3 },
    empty: { paddingVertical: 28, alignItems: 'center' },
    emptyText: { color: colors.mutedForeground, fontSize: 13 },
    form: { gap: 10 },
    input: { minHeight: 48, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.foreground, paddingHorizontal: 14, fontSize: 14 },
    multiline: { minHeight: 88, paddingTop: 13 },
    formActions: { flexDirection: 'row-reverse', gap: 9, marginTop: 4 },
    primaryButton: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    primaryButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    secondaryButton: { minWidth: 86, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
    secondaryButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    pressed: { opacity: 0.72 },
  });
}