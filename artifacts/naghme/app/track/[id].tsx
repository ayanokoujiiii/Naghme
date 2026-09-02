import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DetailCard, DetailRow, DetailShell, SectionHeading } from '@/components/DetailScreen';
import { useColors } from '@/hooks/useColors';
import {
  getAlbumById,
  deleteTrack,
  getPersonalRelationship,
  getTrackById,
  PersonalRelationshipRecord,
  TrackRecord,
  upsertPersonalRelationship,
} from '@/src/db/queries';

const emptyRelationship: PersonalRelationshipRecord = {
  trackId: '',
  rating: null,
  favorite: false,
  emotionalTags: null,
  personalNote: null,
  listeningCount: 0,
};

export default function TrackDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const trackId = Array.isArray(id) ? id[0] : id;
  const [track, setTrack] = useState<TrackRecord | null>(null);
  const [albumTitle, setAlbumTitle] = useState<string>('بدون آلبوم');
  const [relationship, setRelationship] =
    useState<PersonalRelationshipRecord>(emptyRelationship);
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [savingRelationship, setSavingRelationship] = useState<boolean>(false);
  const [relationshipMessage, setRelationshipMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loadTrack = useCallback(async () => {
    if (!trackId) {
      setError('شناسه‌ی قطعه معتبر نیست.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const foundTrack = await getTrackById(trackId);
      if (!foundTrack) {
        setError('قطعه پیدا نشد.');
        return;
      }

      setTrack(foundTrack);
      if (foundTrack.albumId) {
        const album = await getAlbumById(foundTrack.albumId);
        setAlbumTitle(album?.title ?? 'آلبوم پیدا نشد');
      } else {
        setAlbumTitle('بدون آلبوم');
      }

      const savedRelationship = await getPersonalRelationship(foundTrack.id);
      const nextRelationship = savedRelationship ?? {
        ...emptyRelationship,
        trackId: foundTrack.id,
      };
      setRelationship(nextRelationship);
      setNote(nextRelationship.personalNote ?? '');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن قطعه انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    void loadTrack();
  }, [loadTrack]);

  const saveRelationship = async (
    patch: Partial<PersonalRelationshipRecord>,
    successMessage = 'رابطه‌ی شخصی ذخیره شد.',
  ) => {
    if (!track) return;
    const nextRelationship = {
      ...relationship,
      ...patch,
      trackId: track.id,
    };
    setRelationship(nextRelationship);
    setSavingRelationship(true);
    setRelationshipMessage('');
    try {
      const saved = await upsertPersonalRelationship(nextRelationship);
      setRelationship(saved);
      setNote(saved.personalNote ?? '');
      setRelationshipMessage(successMessage);
    } catch (saveError: unknown) {
      setRelationshipMessage(
        saveError instanceof Error ? saveError.message : 'ذخیره‌ی رابطه‌ی شخصی انجام نشد.',
      );
    } finally {
      setSavingRelationship(false);
    }
  };

  const confirmDelete = () => {
    if (!track) return;
    Alert.alert(
      'حذف قطعه',
      `آیا از حذف «${track.title}» مطمئن هستید؟ رابطه‌ی شخصی آن هم حذف می‌شود.`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteTrack(track.id);
                router.back();
              } catch (deleteError: unknown) {
                setError(
                  deleteError instanceof Error ? deleteError.message : 'حذف قطعه انجام نشد.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <DetailShell eyebrow="در حال خواندن" title="قطعه" icon="music">
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </DetailShell>
    );
  }

  if (!track) {
    return (
      <DetailShell eyebrow="آرشیو" title="قطعه پیدا نشد" icon="alert-circle">
        <DetailCard>
          <Text style={styles.errorText}>{error || 'این قطعه دیگر در آرشیو نیست.'}</Text>
        </DetailCard>
      </DetailShell>
    );
  }

  return (
    <DetailShell
      eyebrow="جزئیات قطعه"
      title={track.title}
      icon="music"
      onEdit={() => router.push(`/add-track?id=${track.id}`)}
      onDelete={confirmDelete}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <SectionHeading title="اطلاعات قطعه" caption="جزئیات ثبت‌شده" />
      <DetailCard>
        <DetailRow label="عنوان" value={track.title} />
        <DetailRow label="آلبوم" value={albumTitle} />
        <DetailRow
          label="مدت‌زمان"
          value={track.duration === null ? 'ثبت نشده' : formatDuration(track.duration)}
        />
      </DetailCard>

      <SectionHeading title="رابطه من با این قطعه" caption="چیزی که فقط برای تو معنا دارد" />
      <DetailCard>
        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>مورد علاقه</Text>
          <Pressable
            testID="track-favorite"
            accessibilityRole="button"
            accessibilityLabel={relationship.favorite ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
            onPress={() => void saveRelationship({ favorite: !relationship.favorite })}
            style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}
          >
            <Feather
              name="heart"
              size={21}
              color={relationship.favorite ? colors.destructive : colors.mutedForeground}
            />
            <Text
              style={[
                styles.favoriteText,
                relationship.favorite && { color: colors.destructive },
              ]}
            >
              {relationship.favorite ? 'در علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.ratingBlock}>
          <Text style={styles.preferenceLabel}>امتیاز شخصی</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Pressable
                key={rating}
                testID={`track-rating-${rating}`}
                accessibilityRole="button"
                accessibilityLabel={`امتیاز ${rating} از ۵`}
                onPress={() => void saveRelationship({ rating })}
                style={({ pressed }) => [styles.starButton, pressed && styles.pressed]}
              >
                <Feather
                  name="star"
                  size={25}
                  color={rating <= (relationship.rating ?? 0) ? colors.primary : colors.border}
                  fill={rating <= (relationship.rating ?? 0) ? colors.primary : 'transparent'}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.noteBlock}>
          <Text style={styles.preferenceLabel}>یادداشت شخصی</Text>
          <TextInput
            testID="track-personal-note"
            multiline
            value={note}
            onChangeText={setNote}
            placeholder="این قطعه چه خاطره یا حسی برایت دارد؟"
            placeholderTextColor={colors.mutedForeground}
            selectionColor={colors.primary}
            style={styles.noteInput}
            textAlign="right"
            textAlignVertical="top"
          />
          <Pressable
            testID="track-save-note"
            accessibilityRole="button"
            disabled={savingRelationship}
            onPress={() =>
              void saveRelationship(
                { personalNote: note.trim() || null },
                'یادداشت شخصی ذخیره شد.',
              )
            }
            style={({ pressed }) => [
              styles.noteButton,
              (pressed || savingRelationship) && styles.pressed,
            ]}
          >
            {savingRelationship ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Feather name="save" size={17} color={colors.primaryForeground} />
                <Text style={styles.noteButtonText}>ذخیره‌ی یادداشت</Text>
              </>
            )}
          </Pressable>
        </View>

        {relationshipMessage ? (
          <Text
            style={[
              styles.relationshipMessage,
              relationshipMessage.includes('انجام نشد') && { color: colors.destructive },
            ]}
          >
            {relationshipMessage}
          </Text>
        ) : null}
      </DetailCard>
    </DetailShell>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    loading: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBox: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(217, 107, 95, 0.14)',
      borderRadius: 14,
      padding: 12,
      marginBottom: 18,
    },
    errorText: {
      flex: 1,
      color: colors.destructive,
      fontSize: 13,
      lineHeight: 21,
      textAlign: 'right',
    },
    preferenceRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    preferenceLabel: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'right',
    },
    favoriteButton: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      minHeight: 40,
      paddingHorizontal: 4,
    },
    favoriteText: {
      color: colors.mutedForeground,
      fontSize: 12,
      textAlign: 'right',
    },
    ratingBlock: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    ratingRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: 5,
      marginTop: 8,
    },
    starButton: { padding: 3 },
    noteBlock: { paddingTop: 16 },
    noteInput: {
      minHeight: 116,
      marginTop: 9,
      borderWidth: 1,
      borderColor: colors.input,
      backgroundColor: colors.secondary,
      borderRadius: 15,
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 22,
      paddingHorizontal: 14,
      paddingTop: 13,
    },
    noteButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
    },
    noteButtonText: {
      color: colors.primaryForeground,
      fontSize: 13,
      fontWeight: '700',
    },
    relationshipMessage: {
      color: colors.primary,
      fontSize: 12,
      textAlign: 'right',
      marginTop: 11,
    },
    pressed: { opacity: 0.72 },
  });
}