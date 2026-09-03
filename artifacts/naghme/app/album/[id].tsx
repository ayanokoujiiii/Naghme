import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DetailCard, DetailRow, DetailShell, SectionHeading } from '@/components/DetailScreen';
import { useColors } from '@/hooks/useColors';
import {
  AlbumRecord,
  CreditViewRecord,
  deleteAlbum,
  getAlbumById,
  getCreditsForAlbum,
  getTracksByAlbumId,
  TrackRecord,
  updateAlbum,
} from '@/src/db/queries';

export default function AlbumDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const [album, setAlbum] = useState<AlbumRecord | null>(null);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [credits, setCredits] = useState<CreditViewRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [savingCover, setSavingCover] = useState<boolean>(false);
  const [coverMessage, setCoverMessage] = useState<string>('');

  const loadAlbum = useCallback(async () => {
    if (!albumId) {
      setError('شناسه‌ی آلبوم معتبر نیست.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [foundAlbum, albumTracks, albumCredits] = await Promise.all([
        getAlbumById(albumId),
        getTracksByAlbumId(albumId),
        getCreditsForAlbum(albumId),
      ]);
      if (!foundAlbum) {
        setError('آلبوم پیدا نشد.');
      } else {
        setAlbum(foundAlbum);
        setTracks(albumTracks);
        setCredits(albumCredits);
      }
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن آلبوم انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useFocusEffect(
    useCallback(() => {
      void loadAlbum();
    }, [loadAlbum]),
  );

  const confirmDelete = () => {
    if (!album) return;
    Alert.alert(
      'حذف آلبوم',
      `آیا از حذف «${album.title}» مطمئن هستید؟ قطعه‌های آن حفظ می‌شوند اما بدون آلبوم خواهند شد.`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteAlbum(album.id);
                router.back();
              } catch (deleteError: unknown) {
                setError(
                  deleteError instanceof Error ? deleteError.message : 'حذف آلبوم انجام نشد.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  const pickAlbumCover = async () => {
    if (!album || savingCover) return;
    setCoverMessage('');
    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!permission.granted) {
        if (!permission.canAskAgain && Platform.OS !== 'web') {
          Alert.alert(
            'مجوز تصاویر لازم است',
            'برای انتخاب پوستر آلبوم، دسترسی تصاویر را از تنظیمات دستگاه فعال کن.',
            [
              { text: 'لغو', style: 'cancel' },
              { text: 'باز کردن تنظیمات', onPress: () => void Linking.openSettings() },
            ],
          );
        } else {
          setCoverMessage('برای انتخاب پوستر، اجازه‌ی دسترسی به تصاویر را فعال کن.');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.94,
      });
      if (result.canceled || !result.assets[0]?.uri) return;

      setSavingCover(true);
      const savedAlbum = await updateAlbum(album.id, { coverImage: result.assets[0].uri });
      setAlbum(savedAlbum);
      setCoverMessage('پوستر اختصاصی آلبوم ذخیره شد.');
    } catch (coverError: unknown) {
      setCoverMessage(
        coverError instanceof Error ? coverError.message : 'ذخیره‌ی پوستر آلبوم انجام نشد.',
      );
    } finally {
      setSavingCover(false);
    }
  };

  const removeAlbumCover = () => {
    if (!album || savingCover || !album.coverImage) return;
    Alert.alert(
      'حذف پوستر آلبوم',
      'پوستر اختصاصی این آلبوم حذف شود؟',
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSavingCover(true);
              setCoverMessage('');
              try {
                const savedAlbum = await updateAlbum(album.id, { coverImage: null });
                setAlbum(savedAlbum);
                setCoverMessage('پوستر آلبوم حذف شد.');
              } catch (removeError: unknown) {
                setCoverMessage(
                  removeError instanceof Error ? removeError.message : 'حذف پوستر انجام نشد.',
                );
              } finally {
                setSavingCover(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <DetailShell eyebrow="در حال خواندن" title="آلبوم" icon="disc">
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </DetailShell>
    );
  }

  if (!album) {
    return (
      <DetailShell eyebrow="آرشیو" title="آلبوم پیدا نشد" icon="alert-circle">
        <DetailCard>
          <Text style={styles.errorText}>{error || 'این آلبوم دیگر در آرشیو نیست.'}</Text>
        </DetailCard>
      </DetailShell>
    );
  }

  return (
    <DetailShell
      eyebrow="جزئیات آلبوم"
      title={album.title}
      icon="disc"
      onEdit={() => router.push(`/add-album?id=${album.id}`)}
      onDelete={confirmDelete}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <View style={styles.posterCard}>
        <View style={styles.posterFrame}>
          {album.coverImage ? (
            <Image
              testID="album-cover-image"
              source={{ uri: album.coverImage }}
              style={styles.posterImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.posterFallback}>
              <Feather name="disc" size={42} color={colors.primary} />
              <Text style={styles.posterFallbackText}>بدون پوستر</Text>
            </View>
          )}
        </View>
        <View style={styles.posterCopy}>
          <Text style={styles.posterEyebrow}>پوستر اختصاصی آلبوم</Text>
          <Text style={styles.posterTitle}>
            {album.coverImage ? 'تصویر اصلی آلبوم آماده است' : 'برای این مجموعه یک تصویر انتخاب کن'}
          </Text>
          <Text style={styles.posterDescription}>
            این تصویر در جزئیات آلبوم و نقشه‌ی موسیقی نمایش داده می‌شود.
          </Text>
          <View style={styles.posterActions}>
            <Pressable
              testID="album-pick-cover"
              accessibilityRole="button"
              accessibilityLabel={album.coverImage ? 'تغییر پوستر آلبوم' : 'انتخاب پوستر آلبوم'}
              disabled={savingCover}
              onPress={() => void pickAlbumCover()}
              style={({ pressed }) => [
                styles.posterAction,
                styles.posterActionPrimary,
                (pressed || savingCover) && styles.pressed,
              ]}
            >
              {savingCover ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="upload" size={15} color={colors.primaryForeground} />
                  <Text style={styles.posterActionPrimaryText}>
                    {album.coverImage ? 'تغییر پوستر' : 'انتخاب پوستر'}
                  </Text>
                </>
              )}
            </Pressable>
            {album.coverImage ? (
              <Pressable
                testID="album-remove-cover"
                accessibilityRole="button"
                accessibilityLabel="حذف پوستر آلبوم"
                disabled={savingCover}
                onPress={removeAlbumCover}
                style={({ pressed }) => [
                  styles.posterAction,
                  styles.posterActionSecondary,
                  (pressed || savingCover) && styles.pressed,
                ]}
              >
                <Feather name="trash-2" size={15} color={colors.mutedForeground} />
                <Text style={styles.posterActionSecondaryText}>حذف</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      {coverMessage ? <Text style={styles.coverMessage}>{coverMessage}</Text> : null}
      <SectionHeading title="اطلاعات آلبوم" caption="جزئیات ثبت‌شده" />
      <DetailCard>
        <DetailRow label="عنوان" value={album.title} />
        <DetailRow
          label="سال انتشار"
          value={album.releaseYear === null ? 'ثبت نشده' : album.releaseYear.toString()}
        />
      </DetailCard>

      <SectionHeading title="قطعه‌های آلبوم" caption={`${tracks.length} قطعه`} />
      <DetailCard>
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <Pressable
              key={track.id}
              testID={`album-track-${track.id}`}
              onPress={() => router.push(`/track/${track.id}`)}
              style={({ pressed }) => [styles.trackRow, pressed && styles.pressed]}
            >
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.mutedText}>هنوز قطعه‌ای به این آلبوم وصل نشده است.</Text>
        )}
      </DetailCard>

      {credits.length > 0 ? (
        <>
          <SectionHeading title="اعتبارات آلبوم" caption={`${credits.length} مشارکت`} />
          <DetailCard>
            {credits.map((credit) => (
              <View key={credit.id} style={styles.creditRow}>
                <View style={styles.creditCopy}>
                  <Text style={styles.creditRole}>{credit.roleName}</Text>
                  <Text style={styles.creditArtist}>{credit.artistName}</Text>
                </View>
              </View>
            ))}
          </DetailCard>
        </>
      ) : null}
    </DetailShell>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
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
    posterCard: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 15,
      padding: 15,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    posterFrame: {
      width: 132,
      aspectRatio: 1,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    posterImage: { width: '100%', height: '100%' },
    posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    posterFallbackText: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600' },
    posterCopy: { flex: 1, alignItems: 'flex-end' },
    posterEyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'right' },
    posterTitle: { color: colors.foreground, fontSize: 15, fontWeight: '700', textAlign: 'right', marginTop: 5 },
    posterDescription: { color: colors.mutedForeground, fontSize: 11, lineHeight: 18, textAlign: 'right', marginTop: 5 },
    posterActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: 11 },
    posterAction: { minHeight: 34, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, paddingHorizontal: 10 },
    posterActionPrimary: { backgroundColor: colors.primary },
    posterActionPrimaryText: { color: colors.primaryForeground, fontSize: 11, fontWeight: '700' },
    posterActionSecondary: { backgroundColor: colors.secondary },
    posterActionSecondaryText: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600' },
    coverMessage: { color: colors.primary, fontSize: 11, lineHeight: 18, textAlign: 'right', marginBottom: 10 },
    trackRow: {
      minHeight: 46,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    trackTitle: {
      flex: 1,
      flexShrink: 1,
      color: colors.foreground,
      fontSize: 14,
      textAlign: 'right',
    },
    creditRow: {
      minHeight: 52,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    creditCopy: { flex: 1, alignItems: 'flex-end' },
    creditRole: { color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    creditArtist: { color: colors.foreground, fontSize: 13, textAlign: 'right', marginTop: 3 },
    mutedText: {
      color: colors.mutedForeground,
      fontSize: 13,
      lineHeight: 21,
      textAlign: 'right',
    },
    pressed: { opacity: 0.72 },
  });
}