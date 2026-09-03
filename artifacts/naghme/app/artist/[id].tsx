import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DetailCard, DetailRow, DetailShell, SectionHeading } from '@/components/DetailScreen';
import { useColors } from '@/hooks/useColors';
import {
  ArtistRecord,
  deleteArtist,
  getArtistById,
  getTracksByArtistId,
  TrackRecord,
  updateArtist,
} from '@/src/db/queries';

export default function ArtistDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const artistId = Array.isArray(id) ? id[0] : id;
  const [artist, setArtist] = useState<ArtistRecord | null>(null);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [savingGallery, setSavingGallery] = useState<boolean>(false);
  const [galleryMessage, setGalleryMessage] = useState<string>('');
  const [selectedGalleryUri, setSelectedGalleryUri] = useState<string | null>(null);

  const loadArtist = useCallback(async () => {
    if (!artistId) {
      setError('شناسه‌ی هنرمند معتبر نیست.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [foundArtist, artistTracks] = await Promise.all([
        getArtistById(artistId),
        getTracksByArtistId(artistId),
      ]);
      if (!foundArtist) setError('هنرمند پیدا نشد.');
      else {
        setArtist(foundArtist);
        setTracks(artistTracks);
      }
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن هنرمند انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useFocusEffect(
    useCallback(() => {
      void loadArtist();
    }, [loadArtist]),
  );

  const confirmDelete = () => {
    if (!artist) return;
    Alert.alert(
      'حذف هنرمند',
      `آیا از حذف «${artist.name}» مطمئن هستید؟`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteArtist(artist.id);
                router.back();
              } catch (deleteError: unknown) {
                setError(
                  deleteError instanceof Error ? deleteError.message : 'حذف هنرمند انجام نشد.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  const galleryUris = useMemo(() => parseGalleryImages(artist?.galleryImages), [artist?.galleryImages]);

  const pickGalleryImages = async () => {
    if (!artist || savingGallery) return;
    setGalleryMessage('');
    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!permission.granted) {
        if (!permission.canAskAgain && Platform.OS !== 'web') {
          Alert.alert(
            'مجوز تصاویر لازم است',
            'برای افزودن عکس، دسترسی تصاویر را از تنظیمات دستگاه فعال کن.',
            [
              { text: 'لغو', style: 'cancel' },
              { text: 'باز کردن تنظیمات', onPress: () => void Linking.openSettings() },
            ],
          );
        } else {
          setGalleryMessage('برای افزودن عکس، اجازه‌ی دسترسی به تصاویر را فعال کن.');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.9,
      });
      if (result.canceled) return;

      const selectedUris = result.assets.map((asset) => asset.uri).filter(Boolean);
      const nextUris = Array.from(new Set([...galleryUris, ...selectedUris]));
      if (!nextUris.length) return;

      setSavingGallery(true);
      const savedArtist = await updateArtist(artist.id, {
        galleryImages: JSON.stringify(nextUris),
      });
      setArtist(savedArtist);
      setGalleryMessage(`${selectedUris.length} تصویر به گالری اضافه شد.`);
    } catch (pickError: unknown) {
      setGalleryMessage(
        pickError instanceof Error ? pickError.message : 'افزودن تصویر به گالری انجام نشد.',
      );
    } finally {
      setSavingGallery(false);
    }
  };

  if (loading) {
    return (
      <DetailShell eyebrow="در حال خواندن" title="هنرمند" icon="mic">
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </DetailShell>
    );
  }

  if (!artist) {
    return (
      <DetailShell eyebrow="آرشیو" title="هنرمند پیدا نشد" icon="alert-circle">
        <DetailCard>
          <Text style={styles.errorText}>{error || 'این هنرمند دیگر در آرشیو نیست.'}</Text>
        </DetailCard>
      </DetailShell>
    );
  }

  return (
    <DetailShell
      eyebrow="جزئیات هنرمند"
      title={artist.name}
      icon="mic"
      onEdit={() => router.push(`/add-artist?id=${artist.id}`)}
      onDelete={confirmDelete}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <SectionHeading title="اطلاعات هنرمند" caption="جزئیات ثبت‌شده" />
      <DetailCard>
        <DetailRow label="نام" value={artist.name} />
        <DetailRow label="نوع" value={artist.type ?? 'ثبت نشده'} />
        <DetailRow label="سبک‌ها" value={artist.genres ?? 'ثبت نشده'} />
      </DetailCard>

      <SectionHeading title="یادداشت" />
      <DetailCard>
        <Text style={styles.biography}>
          {artist.biography ?? 'هنوز یادداشتی برای این هنرمند ثبت نشده است.'}
        </Text>
      </DetailCard>

      <View style={styles.galleryHeading}>
        <SectionHeading
          title="گالری تصاویر"
          caption={galleryUris.length ? `${galleryUris.length} تصویر` : 'لحظه‌های این هنرمند'}
        />
        <Pressable
          testID="artist-add-gallery-images"
          accessibilityRole="button"
          accessibilityLabel="افزودن تصاویر به گالری"
          disabled={savingGallery}
          onPress={() => void pickGalleryImages()}
          style={({ pressed }) => [
            styles.galleryAddButton,
            (pressed || savingGallery) && styles.pressed,
          ]}
        >
          {savingGallery ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="image" size={16} color={colors.primaryForeground} />
              <Text style={styles.galleryAddText}>افزودن تصویر</Text>
            </>
          )}
        </Pressable>
      </View>
      <DetailCard>
        {galleryUris.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryRow}
          >
            {galleryUris.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                testID={`artist-gallery-image-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`نمایش تصویر ${index + 1} گالری`}
                onPress={() => setSelectedGalleryUri(uri)}
                style={({ pressed }) => [styles.galleryImageButton, pressed && styles.pressed]}
              >
                <Image source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
                <View style={styles.galleryZoomBadge}>
                  <Feather name="maximize-2" size={14} color={colors.primaryForeground} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyGallery}>
            <View style={styles.emptyGalleryIcon}>
              <Feather name="image" size={23} color={colors.primary} />
            </View>
            <Text style={styles.emptyGalleryTitle}>گالری هنوز خالی است</Text>
            <Text style={styles.emptyGalleryText}>
              چند تصویر از این هنرمند انتخاب کن تا در آرشیوت بماند.
            </Text>
          </View>
        )}
        {galleryMessage ? <Text style={styles.galleryMessage}>{galleryMessage}</Text> : null}
      </DetailCard>

      <SectionHeading title="قطعه‌های هنرمند" caption={`${tracks.length} قطعه`} />
      <DetailCard>
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <Pressable
              key={track.id}
              testID={`artist-track-${track.id}`}
              onPress={() => router.push(`/track/${track.id}`)}
              style={({ pressed }) => [styles.trackRow, pressed && styles.pressed]}
            >
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.mutedText}>هنوز قطعه‌ای به این هنرمند وصل نشده است.</Text>
        )}
      </DetailCard>

      <Modal
        visible={Boolean(selectedGalleryUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedGalleryUri(null)}
      >
        <View style={styles.galleryModalBackdrop}>
          <Pressable
            testID="artist-gallery-close"
            accessibilityRole="button"
            accessibilityLabel="بستن تصویر گالری"
            onPress={() => setSelectedGalleryUri(null)}
            style={({ pressed }) => [styles.galleryCloseButton, pressed && styles.pressed]}
          >
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          {selectedGalleryUri ? (
            <Image
              source={{ uri: selectedGalleryUri }}
              style={styles.galleryFullImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </DetailShell>
  );
}

function parseGalleryImages(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
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
    biography: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 24,
      textAlign: 'right',
    },
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
    mutedText: {
      color: colors.mutedForeground,
      fontSize: 13,
      lineHeight: 21,
      textAlign: 'right',
    },
    pressed: { opacity: 0.72 },
    galleryHeading: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
    },
    galleryAddButton: {
      minHeight: 38,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 13,
      paddingHorizontal: 11,
      backgroundColor: colors.primary,
      marginBottom: 12,
    },
    galleryAddText: {
      color: colors.primaryForeground,
      fontSize: 11,
      fontWeight: '700',
    },
    galleryRow: {
      flexDirection: 'row',
      gap: 11,
      paddingVertical: 2,
    },
    galleryImageButton: {
      width: 142,
      height: 176,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.secondary,
      position: 'relative',
    },
    galleryImage: { width: '100%', height: '100%' },
    galleryZoomBadge: {
      position: 'absolute',
      left: 9,
      bottom: 9,
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: 'rgba(18, 18, 18, 0.72)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyGallery: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      paddingHorizontal: 10,
      backgroundColor: colors.secondary,
      borderRadius: 16,
    },
    emptyGalleryIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyGalleryTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 10,
    },
    emptyGalleryText: {
      color: colors.mutedForeground,
      fontSize: 11,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: 5,
    },
    galleryMessage: {
      color: colors.primary,
      fontSize: 11,
      lineHeight: 18,
      textAlign: 'right',
      marginTop: 10,
    },
    galleryModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    galleryCloseButton: {
      position: 'absolute',
      top: 52,
      right: 18,
      zIndex: 2,
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    galleryFullImage: { width: '100%', height: '82%' },
  });
}