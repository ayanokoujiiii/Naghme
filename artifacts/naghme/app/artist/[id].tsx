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
  TextInput,
  View,
} from 'react-native';
import { DetailCard, DetailRow, DetailShell, SectionHeading } from '@/components/DetailScreen';
import { CollectionPicker } from '@/components/CollectionPicker';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArtistRecord,
  AlbumRecord,
  AlbumTrackRecord,
  deleteArtist,
  getArtistById,
  getArtists,
  getAlbumsForArtist,
  getAlbumTracks,
  getArtistRelationships,
  addArtistRelationship,
  deleteArtistRelationship,
  ArtistRelationshipRecord,
  getCreditsForArtist,
  getTracksByArtistId,
  CreditViewRecord,
  TrackRecord,
  updateArtist,
  addArtistTimelineEvent,
  deleteArtistTimelineEvent,
  getArtistTimelineEvents,
  updateArtistTimelineEvent,
  ArtistTimelineEventRecord,
} from '@/src/db/queries';
import { playTracksInQueue } from '@/src/audio/audioManager';

export default function ArtistDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const artistId = Array.isArray(id) ? id[0] : id;
  const [artist, setArtist] = useState<ArtistRecord | null>(null);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [credits, setCredits] = useState<CreditViewRecord[]>([]);
  const [relationships, setRelationships] = useState<ArtistRelationshipRecord[]>([]);
  const [allArtists, setAllArtists] = useState<ArtistRecord[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<AlbumRecord[]>([]);
  const [artistAlbumTracks, setArtistAlbumTracks] = useState<AlbumTrackRecord[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<ArtistTimelineEventRecord[]>([]);
  const [timelineModalVisible, setTimelineModalVisible] = useState<boolean>(false);
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);
  const [timelineTitle, setTimelineTitle] = useState<string>('');
  const [timelineDescription, setTimelineDescription] = useState<string>('');
  const [timelineDate, setTimelineDate] = useState<string>('');
  const [timelineSource, setTimelineSource] = useState<string>('');
  const [savingTimeline, setSavingTimeline] = useState<boolean>(false);
  const [relationshipModalVisible, setRelationshipModalVisible] = useState<boolean>(false);
  const [relationshipSearch, setRelationshipSearch] = useState<string>('');
  const [relationshipDescription, setRelationshipDescription] = useState<string>('');
  const [relationshipReciprocal, setRelationshipReciprocal] = useState<boolean>(true);
  const [selectedRelatedArtistId, setSelectedRelatedArtistId] = useState<string | null>(null);
  const [savingRelationship, setSavingRelationship] = useState<boolean>(false);
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
  const [pickerTrackId, setPickerTrackId] = useState<string | null>(null);
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
      const [foundArtist, artistTracks, artistCredits, artistRelationships, artistItems, albumsForArtist, artistTimeline] = await Promise.all([
        getArtistById(artistId),
        getTracksByArtistId(artistId),
        getCreditsForArtist(artistId),
        getArtistRelationships(artistId),
        getArtists(),
        getAlbumsForArtist(artistId),
        getArtistTimelineEvents(artistId),
      ]);
      if (!foundArtist) setError('هنرمند پیدا نشد.');
      else {
        setArtist(foundArtist);
        setTracks(artistTracks);
        setCredits(artistCredits);
        setRelationships(artistRelationships);
        setAllArtists(artistItems);
        setArtistAlbums(albumsForArtist);
        setTimelineEvents(artistTimeline);
        const albumTrackLists = await Promise.all(albumsForArtist.map((album) => getAlbumTracks(album.id)));
        setArtistAlbumTracks(albumTrackLists.flat());
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
  const relatedArtistIds = useMemo(
    () => new Set(relationships.map((relationship) => relationship.relatedArtistId)),
    [relationships],
  );
  const availableRelatedArtists = useMemo(() => {
    const query = relationshipSearch.trim().toLocaleLowerCase();
    return allArtists.filter((candidate) => {
      if (!artist || candidate.id === artist.id || relatedArtistIds.has(candidate.id)) return false;
      return !query || candidate.name.toLocaleLowerCase().includes(query);
    });
  }, [allArtists, artist, relatedArtistIds, relationshipSearch]);

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

  const openRelationshipModal = () => {
    setRelationshipSearch('');
    setRelationshipDescription('');
    setRelationshipReciprocal(true);
    setSelectedRelatedArtistId(null);
    setRelationshipModalVisible(true);
  };

  const saveRelationship = async () => {
    if (!artist || !selectedRelatedArtistId || savingRelationship) return;
    setSavingRelationship(true);
    try {
      const relationship = await addArtistRelationship({
        artistId: artist.id,
        relatedArtistId: selectedRelatedArtistId,
        description: relationshipDescription.trim() || null,
        reciprocal: relationshipReciprocal,
      });
      setRelationships((current) =>
        [...current, relationship].sort((left, right) =>
          left.relatedArtistName.localeCompare(right.relatedArtistName, 'fa'),
        ),
      );
      setRelationshipModalVisible(false);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی ارتباط انجام نشد.');
    } finally {
      setSavingRelationship(false);
    }
  };

  const removeRelationship = (relationship: ArtistRelationshipRecord) => {
    Alert.alert(
      'حذف ارتباط',
      `ارتباط با «${relationship.relatedArtistName}» حذف شود؟`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void deleteArtistRelationship(relationship.id)
              .then(() => setRelationships((current) => current.filter((item) => item.id !== relationship.id)))
              .catch((deleteError: unknown) => {
                setError(deleteError instanceof Error ? deleteError.message : 'حذف ارتباط انجام نشد.');
              });
          },
        },
      ],
    );
  };

  const openTimelineModal = (event?: ArtistTimelineEventRecord) => {
    setEditingTimelineId(event?.id ?? null);
    setTimelineTitle(event?.title ?? '');
    setTimelineDescription(event?.description ?? '');
    setTimelineDate(event?.eventDate ?? '');
    setTimelineSource(event?.source ?? '');
    setTimelineModalVisible(true);
  };

  const saveTimelineEvent = async () => {
    if (!artist || !timelineTitle.trim() || savingTimeline) return;
    setSavingTimeline(true);
    try {
      const input = {
        title: timelineTitle,
        description: timelineDescription,
        eventDate: timelineDate,
        source: timelineSource,
      };
      const saved = editingTimelineId
        ? await updateArtistTimelineEvent(editingTimelineId, input)
        : await addArtistTimelineEvent({ artistId: artist.id, ...input });
      setTimelineEvents((current) => {
        const next = editingTimelineId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved];
        return next.sort(compareTimelineEvents);
      });
      setTimelineModalVisible(false);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی رویداد انجام نشد.');
    } finally {
      setSavingTimeline(false);
    }
  };

  const removeTimelineEvent = (event: ArtistTimelineEventRecord) => {
    Alert.alert(
      'حذف رویداد',
      `رویداد «${event.title}» حذف شود؟`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void deleteArtistTimelineEvent(event.id)
              .then(() => setTimelineEvents((current) => current.filter((item) => item.id !== event.id)))
              .catch((deleteError: unknown) =>
                setError(deleteError instanceof Error ? deleteError.message : 'حذف رویداد انجام نشد.'),
              );
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
        <DetailRow label="نام‌های جایگزین" value={artist.alternateTitles ?? 'ثبت نشده'} />
        <DetailRow label="نوع" value={artist.type ?? 'ثبت نشده'} />
        <DetailRow label="سبک‌ها" value={artist.genres ?? 'ثبت نشده'} />
        <DetailRow label="منبع" value={artist.source ?? 'ثبت نشده'} />
      </DetailCard>
      <Pressable
        testID="artist-open-graph"
        accessibilityRole="button"
        onPress={() => router.push(`/graph?focusType=artist&focusId=${artist.id}`)}
        style={({ pressed }) => [styles.graphButton, pressed && styles.pressed]}
      >
        <Feather name="git-branch" size={16} color={colors.primary} />
        <Text style={styles.graphButtonText}>باز کردن در نقشه‌ی موسیقی</Text>
      </Pressable>
      <View style={styles.archiveLinks}>
        <Pressable
          testID="artist-open-journal"
          accessibilityRole="button"
          onPress={() => router.push(`/journal?artistId=${artist.id}`)}
          style={({ pressed }) => [styles.archiveLink, pressed && styles.pressed]}
        >
          <Feather name="book-open" size={16} color={colors.primary} />
          <Text style={styles.archiveLinkText}>دفترچه‌ی این هنرمند</Text>
        </Pressable>
        <Pressable
          testID="artist-open-history"
          accessibilityRole="button"
          onPress={() => router.push(`/history?artistId=${artist.id}`)}
          style={({ pressed }) => [styles.archiveLink, pressed && styles.pressed]}
        >
          <Feather name="headphones" size={16} color={colors.primary} />
          <Text style={styles.archiveLinkText}>تاریخچه‌ی شنیدن</Text>
        </Pressable>
      </View>

      <SectionHeading title="یادداشت" />
      <DetailCard>
        <Text style={styles.biography}>
          {artist.biography ?? 'هنوز یادداشتی برای این هنرمند ثبت نشده است.'}
        </Text>
      </DetailCard>

      <View style={styles.timelineHeading}>
        <SectionHeading
          title="گاه‌شمار هنرمند"
          caption={timelineEvents.length ? `${timelineEvents.length} رویداد` : 'تاریخ‌ها و نقطه‌های مهم'}
        />
        <Pressable
          testID="artist-add-timeline-event"
          accessibilityRole="button"
          onPress={() => openTimelineModal()}
          style={({ pressed }) => [styles.timelineAddButton, pressed && styles.pressed]}
        >
          <Feather name="plus" size={15} color={colors.primaryForeground} />
          <Text style={styles.timelineAddText}>افزودن</Text>
        </Pressable>
      </View>
      <DetailCard>
        {timelineEvents.length ? timelineEvents.map((event) => (
          <View key={event.id} style={styles.timelineRow}>
            <View style={styles.timelineCopy}>
              <Text style={styles.timelineTitle}>{event.title}</Text>
              <Text style={styles.timelineMeta}>{event.eventDate || 'تاریخ ثبت نشده'}{event.source ? `  •  ${event.source}` : ''}</Text>
              {event.description ? <Text style={styles.timelineDescription}>{event.description}</Text> : null}
            </View>
            <View style={styles.timelineActions}>
              <Pressable testID={`artist-edit-timeline-${event.id}`} onPress={() => openTimelineModal(event)}>
                <Feather name="edit-2" size={15} color={colors.primary} />
              </Pressable>
              <Pressable testID={`artist-delete-timeline-${event.id}`} onPress={() => removeTimelineEvent(event)}>
                <Feather name="trash-2" size={15} color={colors.destructive} />
              </Pressable>
            </View>
          </View>
        )) : <Text style={styles.mutedText}>هنوز رویدادی برای این هنرمند ثبت نشده است.</Text>}
      </DetailCard>

      <View style={styles.relationshipHeading}>
        <SectionHeading
          title="هنرمندان مرتبط"
          caption={relationships.length ? `${relationships.length} ارتباط` : 'همکار، استاد، الهام‌بخش…'}
          description="ارتباط این هنرمند با هنرمندان دیگر، مستقل از یک اثر خاص."
        />
        <Pressable
          testID="artist-add-relationship"
          accessibilityRole="button"
          onPress={openRelationshipModal}
          style={({ pressed }) => [styles.relationshipAddButton, pressed && styles.pressed]}
        >
          <Feather name="user-plus" size={15} color={colors.primaryForeground} />
          <Text style={styles.relationshipAddText}>افزودن</Text>
        </Pressable>
      </View>
      <DetailCard>
        {relationships.length ? relationships.map((relationship) => (
          <View key={relationship.id} style={styles.relationshipRow}>
            <Pressable
              testID={`artist-remove-relationship-${relationship.id}`}
              accessibilityLabel="حذف هنرمند مرتبط"
              onPress={() => removeRelationship(relationship)}
              style={({ pressed }) => [styles.relationshipRemove, pressed && styles.pressed]}
            >
              <Feather name="x" size={16} color={colors.destructive} />
            </Pressable>
            <View style={styles.relationshipCopy}>
              <Text style={styles.relationshipName}>{relationship.relatedArtistName}</Text>
              <Text style={styles.relationshipMeta}>
                {relationship.relatedArtistType ?? 'هنرمند'}
                {relationship.description ? `  •  ${relationship.description}` : ''}
              </Text>
            </View>
          </View>
        )) : <Text style={styles.mutedText}>هنوز ارتباطی برای این هنرمند ثبت نشده است.</Text>}
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

      <SectionHeading title="دیسکوگرافی" caption={`${tracks.length} قطعه`} />
      <Discography
        tracks={tracks}
        albums={artistAlbums}
        albumTracks={artistAlbumTracks}
        artistName={artist.name}
        styles={styles}
        colors={colors}
        onTrackPress={(trackId) => router.push(`/track/${trackId}`)}
        onAddToCollection={setPickerTrackId}
      />

      <>
        <View style={styles.creditHeading}>
          <View style={styles.creditHeadingCopy}>
            <SectionHeading
              title="مشارکت‌کنندگان"
              caption={`${credits.length} مشارکت`}
              description="چه کسی در ساخت این اثر نقش داشته و با چه نقشی."
            />
          </View>
          <Pressable
            testID="artist-open-works"
            accessibilityRole="button"
            onPress={() => router.push(`/artist/works/${artist.id}`)}
            style={({ pressed }) => [styles.creditExploreButton, pressed && styles.pressed]}
          >
            <Feather name="layers" size={15} color={colors.primary} />
            <Text style={styles.creditExploreText}>کاوش مشارکت‌ها</Text>
          </Pressable>
        </View>
        {credits.length > 0 ? (
          <DetailCard>
            {credits.map((credit) => (
              <CreditRow
                key={credit.id}
                credit={credit}
                colors={colors}
                styles={styles}
                onPress={() => {
                  if (credit.trackId) router.push(`/track/${credit.trackId}`);
                  else if (credit.albumId) router.push(`/album/${credit.albumId}`);
                }}
              />
            ))}
          </DetailCard>
        ) : (
          <DetailCard>
            <Text style={styles.mutedText}>هنوز مشارکتی برای این هنرمند ثبت نشده است.</Text>
            <Pressable
              onPress={() => router.push('/add-track')}
              style={({ pressed }) => [styles.registerCreditButton, pressed && styles.pressed]}
            >
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={styles.registerCreditText}>ثبت مشارکت هنگام افزودن قطعه</Text>
            </Pressable>
          </DetailCard>
        )}
      </>
      <CollectionPicker
        trackId={pickerTrackId}
        visible={pickerTrackId !== null}
        onClose={() => setPickerTrackId(null)}
      />

      <Modal
        visible={timelineModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimelineModalVisible(false)}
      >
        <View style={[styles.timelineModalBackdrop, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.timelineModalCard}>
            <View style={styles.timelineModalHeader}>
              <Pressable onPress={() => setTimelineModalVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
              <Text style={styles.timelineModalTitle}>{editingTimelineId ? 'ویرایش رویداد' : 'رویداد تازه'}</Text>
            </View>
            <TextInput value={timelineTitle} onChangeText={setTimelineTitle} placeholder="عنوان رویداد" placeholderTextColor={colors.mutedForeground} style={styles.timelineInput} textAlign="right" />
            <TextInput value={timelineDate} onChangeText={setTimelineDate} placeholder="تاریخ اختیاری؛ مثلاً ۱۳۵۰/۰۷/۲۱" placeholderTextColor={colors.mutedForeground} style={styles.timelineInput} textAlign="right" />
            <TextInput value={timelineDescription} onChangeText={setTimelineDescription} placeholder="شرح کوتاه" placeholderTextColor={colors.mutedForeground} style={[styles.timelineInput, styles.timelineDescriptionInput]} textAlign="right" multiline />
            <TextInput value={timelineSource} onChangeText={setTimelineSource} placeholder="منبع این اطلاعات" placeholderTextColor={colors.mutedForeground} style={styles.timelineInput} textAlign="right" />
            <Pressable disabled={!timelineTitle.trim() || savingTimeline} onPress={() => void saveTimelineEvent()} style={({ pressed }) => [styles.timelineSave, (pressed || savingTimeline) && styles.pressed]}>
              {savingTimeline ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.timelineSaveText}>ذخیره‌ی رویداد</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={relationshipModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRelationshipModalVisible(false)}
      >
        <View style={[styles.relationshipModalBackdrop, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.relationshipModalCard}>
            <View style={styles.relationshipModalHeader}>
              <Pressable onPress={() => setRelationshipModalVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
              <View style={styles.relationshipModalCopy}>
                <Text style={styles.relationshipModalTitle}>هنرمند مرتبط</Text>
                <Text style={styles.relationshipModalSubtitle}>یک هنرمند موجود را انتخاب کن</Text>
              <Text style={styles.relationshipModalHint}>
                اینجا ارتباط مستقیم دو هنرمند را ثبت می‌کنی؛ مستقل از قطعه یا آلبوم و بدون نقش مشارکت.
              </Text>
              </View>
            </View>
            <TextInput
              testID="artist-relationship-search"
              value={relationshipSearch}
              onChangeText={setRelationshipSearch}
              placeholder="جستجوی هنرمند…"
              placeholderTextColor={colors.mutedForeground}
              style={styles.relationshipSearch}
              textAlign="right"
            />
            <ScrollView style={styles.relationshipCandidates} keyboardShouldPersistTaps="handled">
              {availableRelatedArtists.length ? availableRelatedArtists.map((candidate) => (
                <Pressable
                  key={candidate.id}
                  onPress={() => setSelectedRelatedArtistId(candidate.id)}
                  style={[
                    styles.relationshipCandidate,
                    selectedRelatedArtistId === candidate.id && styles.relationshipCandidateSelected,
                  ]}
                >
                  <Feather
                    name={selectedRelatedArtistId === candidate.id ? 'check-circle' : 'circle'}
                    size={18}
                    color={selectedRelatedArtistId === candidate.id ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={styles.relationshipCandidateText}>{candidate.name}</Text>
                </Pressable>
              )) : <Text style={styles.mutedText}>هنرمند دیگری برای انتخاب پیدا نشد.</Text>}
            </ScrollView>
            <Pressable
              testID="artist-relationship-reciprocal"
              accessibilityRole="button"
              accessibilityState={{ checked: relationshipReciprocal }}
              onPress={() => setRelationshipReciprocal((current) => !current)}
              style={styles.reciprocalToggle}
            >
              <Feather
                name={relationshipReciprocal ? 'check-square' : 'square'}
                size={18}
                color={relationshipReciprocal ? colors.primary : colors.mutedForeground}
              />
              <View style={styles.reciprocalCopy}>
                <Text style={styles.reciprocalTitle}>ارتباط متقابل</Text>
                <Text style={styles.reciprocalHint}>
                  {relationshipReciprocal
                    ? 'در صفحه‌ی هر دو هنرمند دیده می‌شود.'
                    : 'فقط از این هنرمند به طرف مقابل ثبت می‌شود.'}
                </Text>
              </View>
            </Pressable>
            <TextInput
              value={relationshipDescription}
              onChangeText={setRelationshipDescription}
              placeholder="شرح اختیاری؛ مثلاً همکار در چند اجرا"
              placeholderTextColor={colors.mutedForeground}
              style={styles.relationshipDescriptionInput}
              textAlign="right"
            />
            <Pressable
              testID="artist-save-relationship"
              disabled={!selectedRelatedArtistId || savingRelationship}
              onPress={() => void saveRelationship()}
              style={({ pressed }) => [
                styles.relationshipSave,
                (!selectedRelatedArtistId || savingRelationship || pressed) && styles.pressed,
              ]}
            >
              <Text style={styles.relationshipSaveText}>{savingRelationship ? 'در حال ذخیره…' : 'ذخیره‌ی ارتباط'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

function CreditRow({
  credit,
  colors,
  styles,
  onPress,
}: {
  credit: CreditViewRecord;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const targetTitle = credit.workTitle ?? credit.trackTitle ?? credit.albumTitle ?? 'مقصد نامشخص';
  const targetType = credit.workId ? 'اثر' : credit.trackId ? 'قطعه' : 'آلبوم';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.creditRow, pressed && styles.pressed]}
    >
      <View style={styles.creditCopy}>
        <Text style={styles.creditRole}>{credit.roleName}</Text>
        <Text style={styles.creditTarget} numberOfLines={2}>
          {targetTitle}
        </Text>
        <Text style={styles.creditTargetType}>{targetType}</Text>
      </View>
    </Pressable>
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

function Discography({
  tracks,
  albums,
  albumTracks,
  artistName,
  styles,
  colors,
  onTrackPress,
  onAddToCollection,
}: {
  tracks: TrackRecord[];
  albums: AlbumRecord[];
  albumTracks: AlbumTrackRecord[];
  artistName: string;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useColors>;
  onTrackPress: (trackId: string) => void;
  onAddToCollection: (trackId: string) => void;
}) {
  const albumGroups = albums.map((album) => ({
    album,
    tracks: albumTracks.filter((track) => track.albumTrackAlbumId === album.id),
  })).filter((group) => group.tracks.length > 0);
  const groupedTrackIds = new Set(albumGroups.flatMap((group) => group.tracks.map((track) => track.id)));
  const singles = tracks.filter((track) => !groupedTrackIds.has(track.id));

  return (
    <View style={styles.discography}>
      {albumGroups.map(({ album, tracks: albumTracks }) => (
        <View key={album.id} style={styles.discographyAlbum}>
          <Pressable
            onPress={() => router.push(`/album/${album.id}`)}
            style={({ pressed }) => [styles.discographyAlbumHeader, pressed && styles.pressed]}
          >
            {album.coverImage ? (
              <Image source={{ uri: album.coverImage }} style={styles.discographyCover} resizeMode="cover" />
            ) : (
              <View style={[styles.discographyCover, { backgroundColor: colors.secondary }]}>
                <Feather name="disc" size={17} color={colors.primary} />
              </View>
            )}
            <View style={styles.discographyAlbumCopy}>
              <Text style={styles.discographyAlbumTitle}>{album.title}</Text>
              <Text style={styles.discographyAlbumMeta}>
                {album.releaseYear ? `سال ${album.releaseYear}` : 'سال ثبت نشده'}  •  {albumTracks.length} قطعه
              </Text>
            </View>
          </Pressable>
          {albumTracks.map((track, index) => (
            <View
              key={track.id}
              style={styles.discographyTrack}
            >
              <Pressable
                onPress={() => onTrackPress(track.id)}
                style={({ pressed }) => [styles.discographyTrackMain, pressed && styles.pressed]}
              >
                <Text style={styles.discographyNumber}>{index + 1}</Text>
                <Text style={styles.discographyTrackTitle}>{track.title}</Text>
              </Pressable>
              {track.audioUri ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`پخش ${track.title} و ادامه‌ی آلبوم`}
                  onPress={() => void playTracksInQueue(
                    albumTracks.map((item) => ({ ...item, artistName })),
                    index,
                  )}
                  style={({ pressed }) => [styles.discographyPlayButton, pressed && styles.pressed]}
                >
                  <Feather name="play" size={13} color={colors.primaryForeground} />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`افزودن ${track.title} به مجموعه`}
                onPress={() => onAddToCollection(track.id)}
                style={({ pressed }) => [styles.discographyAddButton, pressed && styles.pressed]}
              >
                <Feather name="plus" size={14} color={colors.primary} />
              </Pressable>
            </View>
          ))}
        </View>
      ))}
      <View style={styles.singlesSection}>
        <Text style={styles.singlesTitle}>تک‌آهنگ‌ها و قطعه‌های بدون آلبوم</Text>
        {singles.length ? singles.map((track, index) => (
          <View
            key={track.id}
            style={styles.discographyTrack}
          >
            <Pressable
              onPress={() => onTrackPress(track.id)}
              style={({ pressed }) => [styles.discographyTrackMain, pressed && styles.pressed]}
            >
              <Feather name="music" size={15} color={colors.primary} />
              <Text style={styles.discographyTrackTitle}>{track.title}</Text>
            </Pressable>
            {track.audioUri ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`پخش ${track.title} و ادامه‌ی تک‌آهنگ‌ها`}
                onPress={() => void playTracksInQueue(
                  singles.map((item) => ({ ...item, artistName })),
                  index,
                )}
                style={({ pressed }) => [styles.discographyPlayButton, pressed && styles.pressed]}
              >
                <Feather name="play" size={13} color={colors.primaryForeground} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`افزودن ${track.title} به مجموعه`}
              onPress={() => onAddToCollection(track.id)}
              style={({ pressed }) => [styles.discographyAddButton, pressed && styles.pressed]}
            >
              <Feather name="plus" size={14} color={colors.primary} />
            </Pressable>
          </View>
        )) : <Text style={styles.mutedText}>تک‌آهنگی ثبت نشده است.</Text>}
      </View>
    </View>
  );
}

function compareTimelineEvents(
  left: ArtistTimelineEventRecord,
  right: ArtistTimelineEventRecord,
): number {
  if (!left.eventDate && !right.eventDate) {
    return left.createdAt.localeCompare(right.createdAt);
  }
  if (!left.eventDate) return 1;
  if (!right.eventDate) return -1;
  return left.eventDate.localeCompare(right.eventDate) || left.createdAt.localeCompare(right.createdAt);
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
    timelineHeading: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
    },
    timelineAddButton: {
      minHeight: 36,
      borderRadius: 12,
      paddingHorizontal: 10,
      marginBottom: 12,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 5,
    },
    timelineAddText: { color: colors.primaryForeground, fontSize: 11, fontWeight: '700' },
    timelineRow: {
      minHeight: 64,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    timelineCopy: { flex: 1, alignItems: 'flex-end' },
    timelineTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    timelineMeta: { color: colors.primary, fontSize: 10, marginTop: 3, textAlign: 'right' },
    timelineDescription: { color: colors.mutedForeground, fontSize: 11, lineHeight: 18, marginTop: 3, textAlign: 'right' },
    timelineActions: { flexDirection: 'row-reverse', gap: 12, paddingHorizontal: 3 },
    timelineModalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.62)',
    },
    timelineModalCard: {
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      padding: 18,
      backgroundColor: colors.background,
    },
    timelineModalHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 14 },
    timelineModalTitle: { flex: 1, color: colors.foreground, fontSize: 17, fontWeight: '700', textAlign: 'right' },
    timelineInput: {
      minHeight: 44,
      borderRadius: 13,
      paddingHorizontal: 13,
      color: colors.foreground,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 12,
      marginBottom: 9,
    },
    timelineDescriptionInput: { minHeight: 76, paddingVertical: 11 },
    timelineSave: {
      minHeight: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginTop: 4,
    },
    timelineSaveText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
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
      marginBottom: 18,
    },
    graphButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    archiveLinks: { flexDirection: 'row-reverse', gap: 9, marginBottom: 18 },
    archiveLink: { flex: 1, minHeight: 46, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8 },
    archiveLinkText: { color: colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
    relationshipHeading: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
    },
    relationshipAddButton: {
      minHeight: 36,
      borderRadius: 12,
      paddingHorizontal: 10,
      marginBottom: 12,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 5,
    },
    relationshipAddText: { color: colors.primaryForeground, fontSize: 11, fontWeight: '700' },
    relationshipRow: {
      minHeight: 56,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    relationshipCopy: { flex: 1, alignItems: 'flex-end' },
    relationshipName: { color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    relationshipMeta: { color: colors.mutedForeground, fontSize: 11, marginTop: 3, textAlign: 'right' },
    relationshipRemove: { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
    relationshipModalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.62)',
    },
    relationshipModalCard: {
      maxHeight: '88%',
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      padding: 18,
      backgroundColor: colors.background,
    },
    relationshipModalHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 14 },
    relationshipModalCopy: { flex: 1, alignItems: 'flex-end' },
    relationshipModalTitle: { color: colors.foreground, fontSize: 17, fontWeight: '700', textAlign: 'right' },
    relationshipModalSubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 3, textAlign: 'right' },
    relationshipModalHint: { color: colors.primary, fontSize: 10, lineHeight: 17, marginTop: 5, textAlign: 'right' },
    modalClose: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
    relationshipSearch: {
      minHeight: 44,
      borderRadius: 13,
      paddingHorizontal: 13,
      color: colors.foreground,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 13,
      marginBottom: 9,
    },
    relationshipCandidates: { maxHeight: 290 },
    relationshipCandidate: {
      minHeight: 46,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 10,
      borderRadius: 12,
      marginBottom: 4,
    },
    relationshipCandidateSelected: { backgroundColor: colors.secondary },
    relationshipCandidateText: { flex: 1, color: colors.foreground, fontSize: 13, textAlign: 'right' },
    relationshipDescriptionInput: {
      minHeight: 72,
      borderRadius: 13,
      paddingHorizontal: 13,
      paddingVertical: 11,
      color: colors.foreground,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 12,
      marginTop: 10,
    },
    reciprocalToggle: {
      minHeight: 54,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 10,
      marginTop: 9,
      borderRadius: 13,
      backgroundColor: colors.secondary,
    },
    reciprocalCopy: { flex: 1, alignItems: 'flex-end' },
    reciprocalTitle: { color: colors.foreground, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    reciprocalHint: { color: colors.mutedForeground, fontSize: 10, lineHeight: 16, marginTop: 2, textAlign: 'right' },
    relationshipSave: {
      minHeight: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginTop: 12,
    },
    relationshipSaveText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    discography: { gap: 12 },
    discographyAlbum: {
      overflow: 'hidden',
      borderRadius: 17,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    discographyAlbumHeader: {
      minHeight: 70,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      padding: 10,
    },
    discographyCover: { width: 48, height: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    discographyAlbumCopy: { flex: 1, alignItems: 'flex-end' },
    discographyAlbumTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    discographyAlbumMeta: { color: colors.primary, fontSize: 10, marginTop: 3, textAlign: 'right' },
    discographyTrack: {
      minHeight: 40,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 13,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    discographyTrackMain: {
      flex: 1,
      minHeight: 40,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
    },
    discographyPlayButton: {
      width: 29,
      height: 29,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginLeft: 5,
    },
    discographyAddButton: {
      width: 29,
      height: 29,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      marginLeft: 4,
    },
    discographyNumber: { width: 22, color: colors.mutedForeground, fontSize: 11, textAlign: 'center' },
    discographyTrackTitle: { flex: 1, color: colors.foreground, fontSize: 13, textAlign: 'right' },
    singlesSection: {
      overflow: 'hidden',
      borderRadius: 17,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingBottom: 4,
    },
    singlesTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right', padding: 13 },
    creditRow: {
      minHeight: 58,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    creditHeading: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
    creditHeadingCopy: { flex: 1 },
    creditExploreButton: { minHeight: 36, flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    creditExploreText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
    registerCreditButton: { minHeight: 40, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: colors.secondary, marginTop: 12 },
    registerCreditText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    creditCopy: { flex: 1, alignItems: 'flex-end' },
    creditRole: { color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'right' },
    creditTarget: { color: colors.foreground, fontSize: 13, textAlign: 'right', marginTop: 3 },
    creditTargetType: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right', marginTop: 2 },
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