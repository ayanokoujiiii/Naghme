import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { MINI_PLAYER_CONTENT_PADDING, useMiniPlayerActive } from '@/hooks/useMiniPlayerActive';
import {
  deletePostcardProject,
  getPostcardProjects,
  updatePostcardProject,
  type PostcardProjectRecord,
} from '@/src/db/queries';

export default function PostcardsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const miniPlayerActive = useMiniPlayerActive();
  const params = useLocalSearchParams<{ trackId?: string | string[] }>();
  const trackId = Array.isArray(params.trackId) ? params.trackId[0] : params.trackId;
  const [projects, setProjects] = useState<PostcardProjectRecord[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setProjects(await getPostcardProjects(trackId));
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن عکس‌نوشته‌ها انجام نشد.');
      setProjects([]);
    }
  }, [trackId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const rename = async (project: PostcardProjectRecord) => {
    const title = draft.trim();
    if (!title) return;
    const updated = await updatePostcardProject(project.id, { title });
    setProjects((items) =>
      items.map((item) => (item.id === updated.id ? updated : item)),
    );
    setEditing(null);
  };

  const remove = (project: PostcardProjectRecord) => {
    Alert.alert(
      'حذف عکس‌نوشته',
      `«${project.title}» حذف شود؟ تصویر ذخیره‌شده در گالری حذف نمی‌شود.`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void deletePostcardProject(project.id).then(() =>
              setProjects((items) => items.filter((item) => item.id !== project.id)),
            );
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="بازگشت" onPress={() => router.back()}>
          <Feather name="arrow-right" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>آرشیو خلاقیت</Text>
          <Text style={styles.title}>عکس‌نوشته‌ها</Text>
        </View>
      </View>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom:
              insets.bottom + (miniPlayerActive ? MINI_PLAYER_CONTENT_PADDING : 24),
          },
        ]}
        scrollEnabled={projects.length > 0}
        ListEmptyComponent={
          error ? (
            <Text style={styles.emptyError}>{error}</Text>
          ) : (
            <Text style={styles.empty}>هنوز عکس‌نوشته‌ای ذخیره نکرده‌ای.</Text>
          )
        }
        renderItem={({ item }) => (
          <PostcardRow
            item={item}
            editing={editing === item.id}
            draft={draft}
            colors={colors}
            styles={styles}
            onDraftChange={setDraft}
            onSave={() => void rename(item)}
            onEdit={() => {
              setEditing(item.id);
              setDraft(item.title);
            }}
            onOpen={() => router.push(`/track/${item.trackId}?postcardId=${item.id}`)}
            onDelete={() => remove(item)}
          />
        )}
      />
    </View>
  );
}

function PostcardRow({
  item,
  editing,
  draft,
  colors,
  styles,
  onDraftChange,
  onSave,
  onEdit,
  onOpen,
  onDelete,
}: {
  item: PostcardProjectRecord;
  editing: boolean;
  draft: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onEdit: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      {item.outputUri ? (
        <Image source={{ uri: item.outputUri }} style={styles.preview} />
      ) : (
        <View style={styles.previewFallback}>
          <Feather name="image" size={28} color={colors.primary} />
        </View>
      )}
      <View style={styles.copy}>
        {editing ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={onDraftChange}
            onSubmitEditing={onSave}
            style={styles.input}
          />
        ) : (
          <Text style={styles.cardTitle}>{item.title}</Text>
        )}
        <Text style={styles.meta}>
           {item.trackTitle}، به‌روزشده در {new Date(item.updatedAt).toLocaleDateString('fa-IR')}
        </Text>
        <View style={styles.actions}>
          {editing ? (
            <Pressable onPress={onSave}>
              <Text style={styles.action}>ذخیره</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onEdit}>
              <Text style={styles.action}>تغییر نام</Text>
            </Pressable>
          )}
          <Pressable onPress={onOpen}>
              <Text style={styles.action}>باز کردن</Text>
          </Pressable>
          <Pressable onPress={onDelete}>
            <Text style={styles.delete}>حذف</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 58,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 22,
    },
    headerCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
    eyebrow: { color: colors.mutedForeground, fontSize: 12, textAlign: 'right' },
    title: { color: colors.foreground, fontSize: 28, fontWeight: '700', textAlign: 'right' },
    list: { gap: 12, paddingBottom: 30 },
    emptyError: { color: colors.destructive, fontSize: 13, lineHeight: 21, textAlign: 'right', paddingVertical: 58 },
    card: {
      flexDirection: 'row-reverse',
      gap: 12,
      padding: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    preview: { width: 86, height: 108, borderRadius: 12 },
    previewFallback: {
      width: 86,
      height: 108,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, alignItems: 'flex-end', justifyContent: 'space-between' },
    cardTitle: { color: colors.cardForeground, fontSize: 15, fontWeight: '700', textAlign: 'right' },
    meta: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 7 },
    actions: { flexDirection: 'row-reverse', gap: 14, marginTop: 12 },
    action: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    delete: { color: colors.destructive, fontSize: 12, fontWeight: '700' },
    input: {
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
      color: colors.foreground,
      width: '100%',
      textAlign: 'right',
      paddingVertical: 3,
    },
    empty: { color: colors.mutedForeground, textAlign: 'center', marginTop: 40 },
  });
}