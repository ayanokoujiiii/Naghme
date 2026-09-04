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
import { CollectionPicker } from '@/components/CollectionPicker';
import { useColors } from '@/hooks/useColors';
import {
  AlbumRecord,
  AlbumTrackRecord,
  ArtistAlbumLinkRecord,
  CreditViewRecord,
  deleteAlbum,
  getAlbumById,
  getAlbumArtistLinks,
  getAlbumTracks,
  getCreditsForAlbum,
  getTracksByAlbumId,
  TrackRecord,
  updateAlbum,
} from '@/src/db/queries';
import { playTracksInQueue } from '@/src/audio/audioManager';

export default function AlbumDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const [album, setAlbum] = useState<AlbumRecord | null>(null);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [albumTrackEntries, setAlbumTrackEntries] = useState<AlbumTrackRecord[]>([]);
  const [credits, setCredits] = useState<CreditViewRecord[]>([]);
  const [albumArtists, setAlbumArtists] = useState<ArtistAlbumLinkRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [savingCover, setSavingCover] = useState<boolean>(false);
  const [coverMessage, setCoverMessage] = useState<string>('');
  const [pickerTrackId, setPickerTrackId] = useState<string | null>(null);

  const loadAlbum = useCallback(async () => {
    if (!albumId) {
      setError('شناسه‌ی آلبوم معتبر نیست.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [foundAlbum, albumTracks, albumCredits, orderedAlbumTracks, linkedArtists] = await Promise.all([
        getAlbumById(albumId),
        getTracksByAlbumId(albumId),
        getCreditsForAlbum(albumId),
        getAlbumTracks(albumId),
        getAlbumArtistLinks(albumId),
      ]);
      if (!foundAlbum) {
        setError('آلبوم پیدا نشد.');
      } else {
        setAlbum(foundAlbum);
        setTracks(albumTracks);
        setAlbumTrackEntries(orderedAlbumTracks);
        setCredits(albumCredits);
        setAlbumArtists(linkedArtists);
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
      <Pressable
        testID="album-open-graph"
        accessibilityRole="button"
        onPress={() => router.push(`/graph?focusType=album&focusId=${album.id}`)}
        style={({ pressed }) => [styles.graphButton, pressed && styles.pressed]}
      >
        <Feather name="git-branch" size={16} color={colors.primary} />
        <Text style={styles.graphButtonText}>باز کردن در نقشه‌ی موسیقی</Text>
      </Pressable>
      <SectionHeading title="هنرمندان آلبوم" caption={`${albumArtists.length} هنرمند`} />
      <DetailCard>
        {albumArtists.length ? albumArtists.map((link) => (
          <Pressable
            key={link.artistId}
            testID={`album-artist-${link.artistId}`}
            onPress={() => router.push(`/artist/${link.artistId}`)}
            style={({ pressed }) => [styles.artistRow, pressed && styles.pressed]}
          >
            <Feather name="mic" size={16} color={colors.primary} />
            <Text style={styles.artistRowText}>{link.artistName}</Text>
          </Pressable>
        )) : <Text style={styles.mutedText}>هنوز هنرمندی برای این آلبوم ثبت نشده است.</Text>}
      </DetailCard>
      <SectionHeading title="اطلاعات آلبوم" caption="جزئیات ثبت‌شده" />
      <DetailCard>
        <DetailRow label="عنوان" value={album.title} />
        <DetailRow
          label="سال انتشار"
          value={album.releaseYear === null ? 'ثبت نشده' : album.releaseYear.toString()}
        />
      </DetailCard>

      <SectionHeading
        title="قطعه‌های آلبوم"
        caption={`${albumTrackEntries.length || tracks.length} قطعه  •  ${new Set(albumTrackEntries.map((track) => track.discNumber).filter((disc): disc is number => disc !== null)).size || 1} دیسک`}
      />
      <DetailCard>
        {albumTrackEntries.length > 0 ? (
          groupAlbumTracks(albumTrackEntries).map((group) => (
            <View key={group.discNumber ?? 'unknown'} style={styles.discGroup}>
              <Text style={styles.discTitle}>
                {group.discNumber === null ? 'ترتیب نامشخص' : `دیسک ${group.discNumber}`}
              </Text>
              {group.tracks.map((track, index) => (
                <View key={track.id} style={styles.trackRow}>
                  <Pressable
                    testID={`album-track-${track.id}`}
                    onPress={() => router.push(`/track/${track.id}`)}
                    style={({ pressed }) => [styles.trackMain, pressed && styles.pressed]}
                  >
                    <Text style={styles.trackNumber}>
                      {track.trackNumber === null ? '—' : track.trackNumber}
                    </Text>
                    <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
                    <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>
                  </Pressable>
                  {track.audioUri ? (
                    <Pressable
                      testID={`album-track-play-${track.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`پخش ${track.title} و ادامه‌ی آلبوم`}
                      onPress={() => void playTracksInQueue(
                        albumTrackEntries.map((entry) => ({
                          ...entry,
                          artistName: albumArtists.find((artist) => artist.artistId === entry.artistId)?.artistName ?? null,
                        })),
                        albumTrackEntries.findIndex((entry) => entry.id === track.id),
                      )}
                      style={({ pressed }) => [styles.trackPlayButton, pressed && styles.pressed]}
                    >
                      <Feather name="play" size={14} color={colors.primaryForeground} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`افزودن ${track.title} به مجموعه`}
                    onPress={() => setPickerTrackId(track.id)}
                    style={({ pressed }) => [styles.collectionAddButton, pressed && styles.pressed]}
                  >
                    <Feather name="plus" size={15} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        ) : tracks.length > 0 ? (
          tracks.map((track, index) => (
            <View key={track.id} style={styles.trackRow}>
              <Pressable onPress={() => router.push(`/track/${track.id}`)} style={({ pressed }) => [styles.trackMain, pressed && styles.pressed]}>
                <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
                <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>
              </Pressable>
              {track.audioUri ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`پخش ${track.title} و ادامه‌ی آلبوم`}
                  onPress={() => void playTracksInQueue(
                    tracks.map((item) => ({
                      ...item,
                      artistName: albumArtists.find((artist) => artist.artistId === item.artistId)?.artistName ?? null,
                    })),
                    index,
                  )}
                  style={({ pressed }) => [styles.trackPlayButton, pressed && styles.pressed]}
                >
                  <Feather name="play" size={14} color={colors.primaryForeground} />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`افزودن ${track.title} به مجموعه`}
                onPress={() => setPickerTrackId(track.id)}
                style={({ pressed }) => [styles.collectionAddButton, pressed && styles.pressed]}
              >
                <Feather name="plus" size={15} color={colors.primary} />
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.mutedText}>هنوز قطعه‌ای به این آلبوم وصل نشده است.</Text>
        )}
      </DetailCard>

      {credits.length > 0 ? (
        <>
          <SectionHeading
            title="مشارکت‌کنندگان"
            caption={`${credits.length} مشارکت`}
            description="چه کسی در ساخت این اثر نقش داشته و با چه نقشی."
          />
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
      <CollectionPicker
        trackId={pickerTrackId}
        visible={pickerTrackId !== null}
        onClose={() => setPickerTrackId(null)}
      />
    </DetailShell>
  );
}

function groupAlbumTracks(entries: AlbumTrackRecord[]) {
  const groups = new Map<number | null, AlbumTrackRecord[]>();
  for (const entry of entries) {
    const current = groups.get(entry.discNumber) ?? [];
    current.push(entry);
    groups.set(entry.discNumber, current);
  }
  return Array.from(groups.entries()).map(([discNumber, groupedTracks]) => ({
    discNumber,
    tracks: groupedTracks,
  }));
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
    graphButton: {
      minHeight: 43,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    graphButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    artistRow: {
      minHeight: 45,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    artistRowText: { flex: 1, color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    trackRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    trackMain: {
      flex: 1,
      minHeight: 46,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
    },
    trackPlayButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginLeft: 4,
    },
    collectionAddButton: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      marginLeft: 4,
    },
    discGroup: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 3, marginBottom: 7 },
    discTitle: { color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'right', paddingVertical: 9 },
    trackNumber: { width: 22, color: colors.mutedForeground, fontSize: 12, textAlign: 'center' },
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