import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const artistId = Array.isArray(id) ? id[0] : id;
  const [artist, setArtist] = useState<ArtistRecord | null>(null);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [savingGallery, setSavingGallery] = useState<boolean>(false);
  const [galleryActionLoading, setGalleryActionLoading] = useState<boolean>(false);
  const [galleryMessage, setGalleryMessage] = useState<string>('');
  const [galleryToast, setGalleryToast] = useState<string>('');
  const [selectedGalleryUri, setSelectedGalleryUri] = useState<string | null>(null);
  const [gridGalleryVisible, setGridGalleryVisible] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileMessage, setProfileMessage] = useState<string>('');
  const galleryToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (galleryToastTimer.current) clearTimeout(galleryToastTimer.current);
    };
  }, []);

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

  const pickProfileImage = async () => {
    if (!artist || savingProfile) return;
    setProfileMessage('');
    try {
      let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!permission.granted) {
        if (!permission.canAskAgain && Platform.OS !== 'web') {
          Alert.alert(
            'مجوز تصاویر لازم است',
            'برای انتخاب عکس اصلی، دسترسی تصاویر را از تنظیمات دستگاه فعال کن.',
            [
              { text: 'لغو', style: 'cancel' },
              { text: 'باز کردن تنظیمات', onPress: () => void Linking.openSettings() },
            ],
          );
        } else {
          setProfileMessage('برای انتخاب عکس اصلی، اجازه‌ی دسترسی به تصاویر را فعال کن.');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.92,
      });
      if (result.canceled || !result.assets[0]?.uri) return;

      setSavingProfile(true);
      const savedArtist = await updateArtist(artist.id, {
        profileImage: result.assets[0].uri,
      });
      setArtist(savedArtist);
      setProfileMessage('عکس اصلی هنرمند ذخیره شد.');
    } catch (pickError: unknown) {
      setProfileMessage(
        pickError instanceof Error ? pickError.message : 'ذخیره‌ی عکس اصلی انجام نشد.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const showGalleryToast = (message: string) => {
    if (galleryToastTimer.current) clearTimeout(galleryToastTimer.current);
    setGalleryToast(message);
    galleryToastTimer.current = setTimeout(() => {
      setGalleryToast('');
      galleryToastTimer.current = null;
    }, 2800);
  };

  const removeGalleryImage = () => {
    if (!artist || !selectedGalleryUri || galleryActionLoading) return;
    const uriToRemove = selectedGalleryUri;
    Alert.alert(
      'حذف از آرشیو',
      'این تصویر از گالری هنرمند حذف شود؟',
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setGalleryActionLoading(true);
              try {
                const nextUris = galleryUris.filter((uri) => uri !== uriToRemove);
                const savedArtist = await updateArtist(artist.id, {
                  galleryImages: nextUris.length ? JSON.stringify(nextUris) : null,
                });
                setArtist(savedArtist);
                setSelectedGalleryUri(null);
                setGalleryMessage('تصویر از آرشیو حذف شد.');
              } catch (removeError: unknown) {
                showGalleryToast(
                  removeError instanceof Error ? removeError.message : 'حذف تصویر انجام نشد.',
                );
              } finally {
                setGalleryActionLoading(false);
              }
            })();
          },
        },
      ],
    );
  };

  const saveGalleryImage = async () => {
    if (!selectedGalleryUri || galleryActionLoading) return;
    if (Platform.OS === 'web') {
      showGalleryToast('ذخیره‌ی تصویر در گوشی روی نسخه‌ی وب در دسترس نیست.');
      return;
    }

    setGalleryActionLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        showGalleryToast('برای ذخیره، اجازه‌ی دسترسی به گالری لازم است.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(selectedGalleryUri);
      console.log('[Naghme artist gallery] saved to library', selectedGalleryUri);
      showGalleryToast('تصویر در گوشی ذخیره شد.');
    } catch (saveError: unknown) {
      console.error('[Naghme artist gallery] save failed', saveError);
      showGalleryToast('ذخیره‌ی تصویر انجام نشد.');
    } finally {
      setGalleryActionLoading(false);
    }
  };

  const removeProfileImage = () => {
    if (!artist || savingProfile || !artist.profileImage) return;
    Alert.alert(
      'حذف عکس اصلی',
      'عکس اصلی این هنرمند حذف شود؟',
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSavingProfile(true);
              setProfileMessage('');
              try {
                const savedArtist = await updateArtist(artist.id, { profileImage: null });
                setArtist(savedArtist);
                setProfileMessage('عکس اصلی حذف شد.');
              } catch (removeError: unknown) {
                setProfileMessage(
                  removeError instanceof Error ? removeError.message : 'حذف عکس اصلی انجام نشد.',
                );
              } finally {
                setSavingProfile(false);
              }
            })();
          },
        },
      ],
    );
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
      <View style={styles.profileCard}>
        <View style={styles.profileAvatarFrame}>
          {artist.profileImage || artist.image ? (
            <Image
              source={{ uri: artist.profileImage ?? artist.image ?? '' }}
              style={styles.profileAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.profileAvatarFallback}>
              <Feather name="mic" size={38} color={colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileEyebrow}>تصویر اصلی هنرمند</Text>
          <Text style={styles.profileTitle}>چهره‌ای برای این صدا</Text>
          <Text style={styles.profileText}>
            یک تصویر مرجع انتخاب کن تا در پروفایل و نقشه‌ی موسیقی دیده شود.
          </Text>
          <View style={styles.profileActions}>
            <Pressable
              testID="artist-pick-profile-image"
              accessibilityRole="button"
              accessibilityLabel="انتخاب عکس اصلی هنرمند"
              disabled={savingProfile}
              onPress={() => void pickProfileImage()}
              style={({ pressed }) => [
                styles.profileAction,
                styles.profileActionPrimary,
                (pressed || savingProfile) && styles.pressed,
              ]}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="upload" size={15} color={colors.primaryForeground} />
                  <Text style={styles.profileActionPrimaryText}>
                    {artist.profileImage ? 'تغییر عکس' : 'انتخاب عکس'}
                  </Text>
                </>
              )}
            </Pressable>
            {artist.profileImage ? (
              <Pressable
                testID="artist-remove-profile-image"
                accessibilityRole="button"
                accessibilityLabel="حذف عکس اصلی هنرمند"
                disabled={savingProfile}
                onPress={removeProfileImage}
                style={({ pressed }) => [
                  styles.profileAction,
                  styles.profileActionSecondary,
                  (pressed || savingProfile) && styles.pressed,
                ]}
              >
                <Feather name="trash-2" size={15} color={colors.mutedForeground} />
                <Text style={styles.profileActionSecondaryText}>حذف</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      {profileMessage ? <Text style={styles.profileMessage}>{profileMessage}</Text> : null}
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
          <View style={styles.galleryActions}>
            {galleryUris.length ? (
              <Pressable
                testID="artist-view-all-gallery"
                accessibilityRole="button"
                accessibilityLabel="نمایش همه‌ی تصاویر به‌صورت شبکه‌ای"
                onPress={() => setGridGalleryVisible(true)}
                style={({ pressed }) => [styles.galleryViewAllButton, pressed && styles.pressed]}
              >
                <Feather name="grid" size={15} color={colors.primary} />
                <Text style={styles.galleryViewAllText}>نمایش همه</Text>
              </Pressable>
            ) : null}
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
      </View>
      <DetailCard>
        {galleryUris.length ? (
          <FlatList
            data={galleryUris}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryRow}
            keyExtractor={(uri, index) => `${uri}-${index}`}
            renderItem={({ item: uri, index }) => (
              <Pressable
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
            )}
          />
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
        visible={gridGalleryVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setGridGalleryVisible(false)}
      >
        <View style={styles.gridGalleryScreen}>
          <View style={[styles.gridGalleryHeader, { paddingTop: insets.top + 10 }]}>
            <Pressable
              testID="artist-grid-gallery-close"
              accessibilityRole="button"
              accessibilityLabel="بستن نمای شبکه‌ای گالری"
              onPress={() => setGridGalleryVisible(false)}
             style={({ pressed }) => [
               styles.galleryCloseButton,
               { top: insets.top + 10 },
               pressed && styles.pressed,
             ]}
            >
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
            <View style={styles.gridGalleryTitleCopy}>
              <Text style={styles.gridGalleryTitle}>همه‌ی تصاویر</Text>
              <Text style={styles.gridGalleryCaption}>{galleryUris.length} تصویر از {artist.name}</Text>
            </View>
            <View style={styles.gridGalleryHeaderSpacer} />
          </View>
          <FlatList
            data={galleryUris}
            numColumns={3}
            keyExtractor={(uri, index) => `grid-${uri}-${index}`}
            columnWrapperStyle={styles.gridColumn}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: uri, index }) => (
              <Pressable
                testID={`artist-grid-gallery-image-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`نمایش تصویر ${index + 1} از گالری`}
                onPress={() => {
                  setGridGalleryVisible(false);
                  setSelectedGalleryUri(uri);
                }}
                style={({ pressed }) => [styles.gridImageButton, pressed && styles.pressed]}
              >
                <Image source={{ uri }} style={styles.gridImage} resizeMode="cover" />
              </Pressable>
            )}
          />
        </View>
      </Modal>
      <Modal
        visible={Boolean(selectedGalleryUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedGalleryUri(null)}
      >
        <View style={[styles.galleryModalBackdrop, { paddingBottom: insets.bottom + 20 }]}>
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
          <View style={styles.galleryToolbar}>
            <Pressable
              testID="artist-gallery-delete"
              accessibilityRole="button"
              accessibilityLabel="حذف از آرشیو"
              disabled={galleryActionLoading}
              onPress={removeGalleryImage}
              style={({ pressed }) => [
                styles.galleryToolbarButton,
                styles.galleryToolbarDelete,
                (pressed || galleryActionLoading) && styles.pressed,
              ]}
            >
              {galleryActionLoading ? (
                <ActivityIndicator size="small" color={colors.destructive} />
              ) : (
                <Feather name="trash-2" size={18} color={colors.destructive} />
              )}
              <Text style={styles.galleryToolbarDeleteText}>حذف از آرشیو</Text>
            </Pressable>
            <Pressable
              testID="artist-gallery-save"
              accessibilityRole="button"
              accessibilityLabel="ذخیره در گوشی"
              disabled={galleryActionLoading}
              onPress={() => void saveGalleryImage()}
              style={({ pressed }) => [
                styles.galleryToolbarButton,
                styles.galleryToolbarSave,
                (pressed || galleryActionLoading) && styles.pressed,
              ]}
            >
              <Feather name="download" size={18} color={colors.primaryForeground} />
              <Text style={styles.galleryToolbarSaveText}>ذخیره در گوشی</Text>
            </Pressable>
          </View>
          {galleryToast ? (
            <View
              style={[styles.galleryToast, { bottom: insets.bottom + 88 }]}
              pointerEvents="none"
            >
              <Feather name="check-circle" size={16} color={colors.primary} />
              <Text style={styles.galleryToastText}>{galleryToast}</Text>
            </View>
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
    profileCard: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 15,
      padding: 15,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileAvatarFrame: {
      width: 104,
      height: 104,
      borderRadius: 52,
      padding: 4,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.38,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 7,
    },
    profileAvatar: { width: '100%', height: '100%', borderRadius: 48 },
    profileAvatarFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 48,
      backgroundColor: colors.secondary,
    },
    profileCopy: { flex: 1, alignItems: 'flex-end' },
    profileEyebrow: { color: colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'right' },
    profileTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', textAlign: 'right', marginTop: 4 },
    profileText: { color: colors.mutedForeground, fontSize: 11, lineHeight: 18, textAlign: 'right', marginTop: 5 },
    profileActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: 10 },
    profileAction: { minHeight: 34, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, paddingHorizontal: 10 },
    profileActionPrimary: { backgroundColor: colors.primary },
    profileActionPrimaryText: { color: colors.primaryForeground, fontSize: 11, fontWeight: '700' },
    profileActionSecondary: { backgroundColor: colors.secondary },
    profileActionSecondaryText: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600' },
    profileMessage: { color: colors.primary, fontSize: 11, lineHeight: 18, textAlign: 'right', marginTop: 8 },
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
    galleryActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginBottom: 12 },
    galleryAddButton: {
      minHeight: 38,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 13,
      paddingHorizontal: 11,
      backgroundColor: colors.primary,
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
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: colors.galleryFrame,
      borderWidth: 8,
      borderColor: colors.galleryFrame,
      position: 'relative',
      shadowColor: '#000000',
      shadowOpacity: 0.46,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
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
    galleryViewAllButton: {
      minHeight: 38,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderRadius: 13,
      paddingHorizontal: 10,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.border,
    },
    galleryViewAllText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    gridGalleryScreen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 13 },
    gridGalleryHeader: {
      paddingTop: 55,
      paddingBottom: 15,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    gridGalleryTitleCopy: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 12 },
    gridGalleryTitle: { color: colors.foreground, fontSize: 20, fontWeight: '700', textAlign: 'right' },
    gridGalleryCaption: { color: colors.mutedForeground, fontSize: 11, marginTop: 4, textAlign: 'right' },
    gridGalleryHeaderSpacer: { width: 42, height: 42 },
    gridContent: { paddingTop: 16, paddingBottom: 30 },
    gridColumn: { justifyContent: 'space-between', gap: 9, marginBottom: 11 },
    gridImageButton: {
      width: '31.8%',
      aspectRatio: 0.78,
      borderRadius: 4,
      overflow: 'hidden',
      padding: 5,
      backgroundColor: colors.galleryFrame,
      borderWidth: 1,
      borderColor: colors.galleryFrame,
      shadowColor: '#000000',
      shadowOpacity: 0.42,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    gridImage: { flex: 1, borderRadius: 1 },
    galleryCloseButton: {
      position: 'absolute',
      top: 10,
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
    galleryToolbar: {
      width: '100%',
      maxWidth: 420,
      flexDirection: 'row-reverse',
      gap: 10,
      marginTop: 18,
    },
    galleryToolbarButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 16,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 10,
    },
    galleryToolbarDelete: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.destructive,
    },
    galleryToolbarSave: { backgroundColor: colors.primary },
    galleryToolbarDeleteText: { color: colors.destructive, fontSize: 12, fontWeight: '700' },
    galleryToolbarSaveText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700' },
    galleryToast: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 88,
      minHeight: 46,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 14,
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    galleryToastText: { color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  });
}