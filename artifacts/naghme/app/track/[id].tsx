import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DetailCard, DetailRow, DetailShell, SectionHeading } from '@/components/DetailScreen';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { PostcardStudio } from '@/src/components/PostcardStudio';
import { useColors } from '@/hooks/useColors';
import {
  AudioPlaybackSnapshot,
  getAudioSnapshot,
  loadAudio,
  subscribeToAudio,
  toggleAudioPlayback,
} from '@/src/audio/audioManager';
import {
  addJournalEntry,
  CreditViewRecord,
  deleteJournalEntry,
  getAlbumById,
  getCreditsForTrack,
  getJournalEntries,
  getListeningHistory,
  deleteTrack,
  getArtistById,
  getPersonalRelationship,
  getOtherTracksWithSameTitle,
  getTrackById,
  JournalEntryRecord,
  ListeningHistoryRecord,
  logListen,
  PersonalRelationshipRecord,
  TrackRecord,
  VersionTrackRecord,
  updateJournalEntry,
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

const moodOptions = [
  { value: 'آرام', icon: 'moon' as const },
  { value: 'غمگین', icon: 'cloud-rain' as const },
  { value: 'متفکر', icon: 'book-open' as const },
  { value: 'پرانرژی', icon: 'sun' as const },
];

export default function TrackDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const trackId = Array.isArray(id) ? id[0] : id;
  const [track, setTrack] = useState<TrackRecord | null>(null);
  const [artistName, setArtistName] = useState<string>('بدون هنرمند');
  const [albumTitle, setAlbumTitle] = useState<string>('بدون آلبوم');
  const [relationship, setRelationship] =
    useState<PersonalRelationshipRecord>(emptyRelationship);
  const [generalNote, setGeneralNote] = useState<string>('');
  const [journalEntries, setJournalEntries] = useState<JournalEntryRecord[]>([]);
  const [listeningHistory, setListeningHistory] = useState<ListeningHistoryRecord[]>([]);
  const [otherVersions, setOtherVersions] = useState<VersionTrackRecord[]>([]);
  const [credits, setCredits] = useState<CreditViewRecord[]>([]);
  const [journalModalVisible, setJournalModalVisible] = useState<boolean>(false);
  const [lyricsModalVisible, setLyricsModalVisible] = useState<boolean>(false);
  const [postcardVisible, setPostcardVisible] = useState<boolean>(false);
  const [sheetMusicModalVisible, setSheetMusicModalVisible] = useState<boolean>(false);
  const [editingJournalEntryId, setEditingJournalEntryId] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [journalNote, setJournalNote] = useState<string>('');
  const [savingJournal, setSavingJournal] = useState<boolean>(false);
  const [journalMessage, setJournalMessage] = useState<string>('');
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
      const [album, artist, versions, trackCredits] = await Promise.all([
        foundTrack.albumId ? getAlbumById(foundTrack.albumId) : Promise.resolve(null),
        foundTrack.artistId ? getArtistById(foundTrack.artistId) : Promise.resolve(null),
        getOtherTracksWithSameTitle(foundTrack.id, foundTrack.title),
        getCreditsForTrack(foundTrack.id),
      ]);
      setAlbumTitle(foundTrack.albumId ? album?.title ?? 'آلبوم پیدا نشد' : 'بدون آلبوم');
      setArtistName(foundTrack.artistId ? artist?.name ?? 'هنرمند پیدا نشد' : 'بدون هنرمند');
      setOtherVersions(versions);
      setCredits(trackCredits);

      const [savedRelationship, savedJournalEntries, savedListeningHistory] =
        await Promise.all([
          getPersonalRelationship(foundTrack.id),
          getJournalEntries(foundTrack.id),
          getListeningHistory(foundTrack.id),
        ]);
      const nextRelationship = savedRelationship ?? {
        ...emptyRelationship,
        trackId: foundTrack.id,
      };
      setRelationship(nextRelationship);
      setGeneralNote(nextRelationship.personalNote ?? '');
      setJournalEntries(savedJournalEntries);
      setListeningHistory(savedListeningHistory);
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
      setGeneralNote(saved.personalNote ?? '');
      setRelationshipMessage(successMessage);
    } catch (saveError: unknown) {
      setRelationshipMessage(
        saveError instanceof Error ? saveError.message : 'ذخیره‌ی رابطه‌ی شخصی انجام نشد.',
      );
    } finally {
      setSavingRelationship(false);
    }
  };

  const openJournalModal = () => {
    setEditingJournalEntryId(null);
    setSelectedMood('');
    setJournalNote('');
    setJournalMessage('');
    setJournalModalVisible(true);
  };

  const openEditJournalModal = (entry: JournalEntryRecord) => {
    setEditingJournalEntryId(entry.id);
    setSelectedMood(entry.mood);
    setJournalNote(entry.note);
    setJournalMessage('');
    setJournalModalVisible(true);
  };

  const closeJournalModal = () => {
    if (savingJournal) return;
    setJournalModalVisible(false);
    setEditingJournalEntryId(null);
  };

  const submitJournalEntry = async () => {
    if (!track || savingJournal) return;
    if (!selectedMood) {
      setJournalMessage('اول حال خودت را انتخاب کن.');
      return;
    }
    if (!journalNote.trim()) {
      setJournalMessage('چند کلمه از حال امروزت بنویس.');
      return;
    }

    setSavingJournal(true);
    setJournalMessage('');
    try {
      if (editingJournalEntryId) {
        const updatedEntry = await updateJournalEntry(editingJournalEntryId, {
          mood: selectedMood,
          note: journalNote,
        });
        setJournalEntries((currentEntries) =>
          currentEntries.map((entry) =>
            entry.id === updatedEntry.id ? updatedEntry : entry,
          ),
        );
      } else {
        const entry = await addJournalEntry({
          trackId: track.id,
          mood: selectedMood,
          note: journalNote,
        });
        setJournalEntries((currentEntries) => [entry, ...currentEntries]);
      }
      setJournalModalVisible(false);
      setEditingJournalEntryId(null);
      setSelectedMood('');
      setJournalNote('');
    } catch (saveError: unknown) {
      setJournalMessage(
        saveError instanceof Error ? saveError.message : 'ثبت حال انجام نشد.',
      );
    } finally {
      setSavingJournal(false);
    }
  };

  const handlePlayStarted = () => {
    if (!track) return;
    void logListen(track.id)
      .then((entry) => {
        setListeningHistory((currentHistory) => [entry, ...currentHistory]);
      })
      .catch(() => {
        // Playback should remain uninterrupted if a background history write fails.
      });
  };

  const confirmDeleteJournal = (entry: JournalEntryRecord) => {
    Alert.alert(
      'حذف از دفترچه',
      'این لحظه از دفترچه‌ی خاطرات حذف شود؟',
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void deleteJournalEntry(entry.id)
              .then(() => {
                setJournalEntries((currentEntries) =>
                  currentEntries.filter((currentEntry) => currentEntry.id !== entry.id),
                );
              })
              .catch((deleteError: unknown) => {
                setRelationshipMessage(
                  deleteError instanceof Error ? deleteError.message : 'حذف یادداشت انجام نشد.',
                );
              });
          },
        },
      ],
    );
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
      subtitle={track.versionName ? `نسخه / اجرا: ${track.versionName}` : undefined}
      icon="music"
      onEdit={() => router.push(`/add-track?id=${track.id}`)}
      onDelete={confirmDelete}
    >
      <View style={styles.artworkCard}>
        {track.coverImage ? (
          <Image
            source={{ uri: track.coverImage }}
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.artworkFallback}>
            <Feather name="music" size={52} color={colors.primary} />
            <Text style={styles.artworkFallbackText}>آرشیو نغمه</Text>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <SectionHeading title="اطلاعات قطعه" caption="جزئیات ثبت‌شده" />
      <DetailCard>
        <DetailRow label="عنوان" value={track.title} />
        <DetailRow label="هنرمند" value={artistName} />
        <DetailRow label="آلبوم" value={albumTitle} />
        <DetailRow
          label="مدت‌زمان"
          value={track.duration === null ? 'ثبت نشده' : formatDuration(track.duration)}
        />
      </DetailCard>

      {credits.length > 0 ? (
        <>
          <SectionHeading title="اعتبارات صریح" caption={`${credits.length} مشارکت`} />
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

      {otherVersions.length ? (
        <>
          <SectionHeading
            title="اجراهای دیگر این قطعه"
            caption={`${otherVersions.length} اجرای دیگر`}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.versionsRow}
          >
            {otherVersions.map((version) => (
              <Pressable
                key={version.id}
                testID={`track-other-version-${version.id}`}
                accessibilityRole="button"
                onPress={() => router.push(`/track/${version.id}`)}
                style={({ pressed }) => [styles.versionCard, pressed && styles.pressed]}
              >
                {version.coverImage ? (
                  <Image source={{ uri: version.coverImage }} style={styles.versionArtwork} />
                ) : (
                  <View style={styles.versionArtworkFallback}>
                    <Feather name="music" size={24} color={colors.primary} />
                  </View>
                )}
                <View style={styles.versionCopy}>
                  <Text style={styles.versionTitle} numberOfLines={2}>
                    {version.versionName || 'اجرای دیگر'}
                  </Text>
                  <Text style={styles.versionArtist} numberOfLines={1}>
                    {version.artistName || 'هنرمند نامشخص'}
                  </Text>
                  {version.albumTitle ? (
                    <Text style={styles.versionAlbum} numberOfLines={1}>
                      {version.albumTitle}
                    </Text>
                  ) : null}
                </View>
                <Feather name="chevron-left" size={17} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {track.lyrics ? (
        <>
          <SectionHeading title="متن ترانه / تصنیف" caption="متن کامل و خوانا" />
          <DetailCard>
            <Text style={styles.lyricsPreview} numberOfLines={5}>{track.lyrics}</Text>
            <Pressable
              testID="track-open-lyrics"
              accessibilityRole="button"
              onPress={() => setLyricsModalVisible(true)}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
            >
              <Feather name="book-open" size={17} color={colors.primary} />
              <Text style={styles.secondaryActionText}>نمایش متن کامل</Text>
            </Pressable>
            <Pressable
              testID="track-open-postcard"
              accessibilityRole="button"
              onPress={() => setPostcardVisible(true)}
              style={({ pressed }) => [styles.postcardAction, pressed && styles.pressed]}
            >
              <Feather name="image" size={17} color={colors.primaryForeground} />
              <Text style={styles.postcardActionText}>ساخت عکس‌نوشته</Text>
            </Pressable>
          </DetailCard>
        </>
      ) : null}

      {track.sheetMusicUri ? (
        <>
          <SectionHeading title="نت موسیقی" caption="تصویر ذخیره‌شده روی دستگاه" />
          <DetailCard>
            <Pressable
              testID="track-open-sheet-music"
              accessibilityRole="button"
              onPress={() => setSheetMusicModalVisible(true)}
              style={({ pressed }) => [styles.sheetPreviewButton, pressed && styles.pressed]}
            >
              <Image source={{ uri: track.sheetMusicUri }} style={styles.sheetPreview} resizeMode="cover" />
              <View style={styles.sheetPreviewOverlay}>
                <Feather name="maximize-2" size={18} color="#FFFFFF" />
                <Text style={styles.sheetPreviewText}>بازکردن در اندازه‌ی کامل</Text>
              </View>
            </Pressable>
          </DetailCard>
        </>
      ) : null}

      {track.audioUri ? (
        <AudioPlayer
          trackId={track.id}
          uri={track.audioUri}
          track={track}
          artistName={artistName}
          colors={colors}
          styles={styles}
          onPlayStarted={handlePlayStarted}
        />
      ) : null}
      <Text style={styles.listenCount}>
        تعداد دفعات شنیده‌شده: {listeningHistory.length}
      </Text>

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

        <View style={styles.generalNoteBlock}>
          <Text style={styles.preferenceLabel}>یادداشت کلی اثر</Text>
          <Text style={styles.generalNoteCaption}>
            یادداشتی ثابت درباره‌ی معنای این قطعه برای تو
          </Text>
          <TextInput
            testID="track-personal-note"
            multiline
            value={generalNote}
            onChangeText={setGeneralNote}
            placeholder="این قطعه چه خاطره یا معنایی برایت دارد؟"
            placeholderTextColor={colors.mutedForeground}
            selectionColor={colors.primary}
            style={styles.generalNoteInput}
            textAlign="right"
            textAlignVertical="top"
          />
          <Pressable
            testID="track-save-note"
            accessibilityRole="button"
            disabled={savingRelationship}
            onPress={() =>
              void saveRelationship(
                { personalNote: generalNote.trim() || null },
                'یادداشت کلی اثر ذخیره شد.',
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
                <Text style={styles.noteButtonText}>ذخیره‌ی یادداشت کلی</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.diaryBlock}>
          <View style={styles.diaryHeader}>
            <View style={styles.diaryHeaderCopy}>
              <Text style={styles.preferenceLabel}>دفترچه خاطرات لحظه‌ای</Text>
              <Text style={styles.diaryCaption}>هر ثبت، یک لحظه‌ی تازه؛ هیچ‌چیز جایگزین نمی‌شود</Text>
            </View>
            <View style={styles.diaryIcon}>
              <Feather name="book-open" size={18} color={colors.primary} />
            </View>
          </View>

          {journalEntries.length ? (
            <View style={styles.timeline}>
              {journalEntries.map((entry, index) => (
                <JournalTimelineEntry
                  key={entry.id}
                  entry={entry}
                  isLast={index === journalEntries.length - 1}
                  colors={colors}
                  styles={styles}
                  onDelete={() => confirmDeleteJournal(entry)}
                   onEdit={() => openEditJournalModal(entry)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyDiary}>
              <Feather name="edit-3" size={20} color={colors.mutedForeground} />
              <Text style={styles.emptyDiaryTitle}>هنوز چیزی در این دفترچه نیست</Text>
              <Text style={styles.emptyDiaryText}>
                اولین حال و خاطره‌ات را برای این قطعه ثبت کن.
              </Text>
            </View>
          )}

          <Pressable
            testID="track-log-mood"
            accessibilityRole="button"
            onPress={openJournalModal}
            style={({ pressed }) => [styles.noteButton, pressed && styles.pressed]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
            <Text style={styles.noteButtonText}>ثبت حالِ الان</Text>
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

      <JournalEntryModal
        visible={journalModalVisible}
        editing={Boolean(editingJournalEntryId)}
        selectedMood={selectedMood}
        note={journalNote}
        message={journalMessage}
        saving={savingJournal}
        colors={colors}
        styles={styles}
        onClose={closeJournalModal}
        onMoodChange={setSelectedMood}
        onNoteChange={setJournalNote}
        onSubmit={() => void submitJournalEntry()}
      />
      <LyricsModal
        visible={lyricsModalVisible}
        lyrics={track.lyrics ?? ''}
        title={track.title}
        colors={colors}
        styles={styles}
        onClose={() => setLyricsModalVisible(false)}
      />
      <PostcardStudio
        visible={postcardVisible}
        title={track.title}
        lyrics={track.lyrics ?? ''}
        coverImage={track.coverImage}
        artistName={artistName}
        onClose={() => setPostcardVisible(false)}
      />
      <SheetMusicModal
        visible={sheetMusicModalVisible}
        uri={track.sheetMusicUri}
        title={track.title}
        colors={colors}
        styles={styles}
        onClose={() => setSheetMusicModalVisible(false)}
      />
    </DetailShell>
  );
}

function AudioPlayer({
  trackId,
  uri,
  track,
  artistName,
  colors,
  styles,
  onPlayStarted,
}: {
  trackId: string;
  uri: string;
  track: TrackRecord;
  artistName: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onPlayStarted?: () => void;
}) {
  const [audio, setAudio] = useState<AudioPlaybackSnapshot>(() => getAudioSnapshot());
  const [interactionError, setInteractionError] = useState<string>('');

  useEffect(() => {
    const unsubscribe = subscribeToAudio(setAudio);
    setInteractionError('');
    const currentAudio = getAudioSnapshot();
    if (!currentAudio.trackId || (currentAudio.trackId === trackId && currentAudio.uri === uri)) {
      void loadAudio(uri, trackId, {
        title: track.title,
        coverImage: track.coverImage,
        versionName: track.versionName,
        artistName,
        lyrics: track.lyrics,
        durationSeconds: track.duration,
      }).catch(() => undefined);
    }
    return unsubscribe;
  }, [artistName, track, trackId, uri]);

  const isCurrentTrack = audio.trackId === trackId && audio.uri === uri;
  const ready = isCurrentTrack && audio.isLoaded;
  const isPlaying = isCurrentTrack && audio.isPlaying;
  const busy = isCurrentTrack && (audio.isLoading || audio.isBuffering);
  const error = isCurrentTrack ? interactionError || audio.error : '';
  const metadata = {
    title: track.title,
    coverImage: track.coverImage,
    versionName: track.versionName,
    artistName,
    lyrics: track.lyrics,
    durationSeconds: track.duration,
  };

  const togglePlayback = async () => {
    if (busy) return;

    setInteractionError('');
    try {
      if (!isCurrentTrack) {
        await loadAudio(uri, trackId, metadata);
      }
      const started = await toggleAudioPlayback();
      if (started) onPlayStarted?.();
    } catch {
      setInteractionError('پخش فایل صوتی انجام نشد.');
    }
  };

  return (
    <Pressable
      testID="track-open-player"
      accessibilityRole="button"
      accessibilityLabel="بازکردن پخش‌کننده"
      onPress={() => router.push('/player')}
      style={({ pressed }) => [styles.audioPlayerCard, pressed && styles.pressed]}
    >
      <View style={styles.audioPlayerIcon}>
        <Feather name="headphones" size={19} color={colors.primary} />
      </View>
      <View style={styles.audioPlayerCopy}>
        <Text style={styles.audioPlayerTitle}>فایل صوتی قطعه</Text>
        <Text style={styles.audioPlayerSubtitle}>
          {error || (busy && !ready ? 'در حال آماده‌سازی…' : isPlaying ? 'در حال پخش' : 'آماده‌ی پخش')}
        </Text>
      </View>
      <Pressable
        testID="track-audio-toggle"
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'توقف پخش' : 'پخش قطعه'}
         disabled={busy || (isCurrentTrack && !ready)}
        onPress={() => void togglePlayback()}
        style={({ pressed }) => [
          styles.audioPlayerButton,
           (busy || (isCurrentTrack && !ready)) && styles.audioPlayerButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Feather
            name={isPlaying ? 'pause' : 'play'}
            size={19}
            color={colors.primaryForeground}
          />
        )}
      </Pressable>
    </Pressable>
  );
}

function JournalTimelineEntry({
  entry,
  isLast,
  colors,
  styles,
  onDelete,
  onEdit,
}: {
  entry: JournalEntryRecord;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={styles.timelineEntry}>
      <View style={styles.timelineRail}>
        <View style={styles.timelineDot} />
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.timelineMeta}>
          <Text style={styles.timelineDate}>{formatDiaryDate(entry.createdAt)}</Text>
          <View style={styles.timelineMetaActions}>
            <View style={styles.moodBadge}>
              <Text style={styles.moodBadgeText}>{entry.mood}</Text>
            </View>
            <Pressable
              testID={`edit-journal-${entry.id}`}
              accessibilityRole="button"
              accessibilityLabel="ویرایش این یادداشت"
              onPress={onEdit}
              hitSlop={8}
              style={({ pressed }) => [styles.timelineEdit, pressed && styles.pressed]}
            >
              <Feather name="edit-2" size={14} color={colors.primary} />
            </Pressable>
            <Pressable
              testID={`delete-journal-${entry.id}`}
              accessibilityRole="button"
              accessibilityLabel="حذف این یادداشت"
              onPress={onDelete}
              hitSlop={8}
              style={({ pressed }) => [styles.timelineDelete, pressed && styles.pressed]}
            >
              <Feather name="trash-2" size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.timelineNote}>{entry.note}</Text>
      </View>
    </View>
  );
}

function LyricsModal({
  visible,
  lyrics,
  title,
  colors,
  styles,
  onClose,
}: {
  visible: boolean;
  lyrics: string;
  title: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.fullModalBackdrop}>
        <View style={styles.fullModalCard}>
          <View style={styles.fullModalHeader}>
            <Pressable
              testID="track-lyrics-close"
              accessibilityRole="button"
              accessibilityLabel="بستن متن ترانه"
              onPress={onClose}
              style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
            >
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
            <View style={styles.fullModalTitleCopy}>
              <Text style={styles.modalEyebrow}>متن ترانه / تصنیف</Text>
              <Text style={styles.fullModalTitle} numberOfLines={2}>{title}</Text>
            </View>
            <View style={styles.modalIcon}>
              <Feather name="book-open" size={19} color={colors.primary} />
            </View>
          </View>
          <KeyboardAwareScrollViewCompat
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lyricsContent}
          >
            <Text style={styles.lyricsText}>{lyrics}</Text>
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

function SheetMusicModal({
  visible,
  uri,
  title,
  colors,
  styles,
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  title: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
}) {
  if (!uri) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetModalBackdrop}>
        <View style={styles.sheetModalCard}>
          <View style={styles.fullModalHeader}>
            <Pressable
              testID="track-sheet-music-close"
              accessibilityRole="button"
              accessibilityLabel="بستن تصویر نت"
              onPress={onClose}
              style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
            >
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
            <View style={styles.fullModalTitleCopy}>
              <Text style={styles.modalEyebrow}>نت موسیقی</Text>
              <Text style={styles.fullModalTitle} numberOfLines={2}>{title}</Text>
            </View>
            <View style={styles.modalIcon}>
              <Feather name="image" size={19} color={colors.primary} />
            </View>
          </View>
          <Image source={{ uri }} style={styles.sheetFullImage} resizeMode="contain" />
        </View>
      </View>
    </Modal>
  );
}

function JournalEntryModal({
  visible,
  editing,
  selectedMood,
  note,
  message,
  saving,
  colors,
  styles,
  onClose,
  onMoodChange,
  onNoteChange,
  onSubmit,
}: {
  visible: boolean;
  editing: boolean;
  selectedMood: string;
  note: string;
  message: string;
  saving: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
  onMoodChange: (mood: string) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.modalContentContainer}
          keyboardShouldPersistTaps="handled"
          bottomOffset={20}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Pressable
                testID="track-mood-close"
                accessibilityRole="button"
                accessibilityLabel="بستن"
                onPress={onClose}
                style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
              >
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
              <View style={styles.modalTitleCopy}>
                <Text style={styles.modalEyebrow}>دفترچه‌ی شخصی</Text>
                 <Text style={styles.modalTitle}>
                   {editing ? 'ویرایش حال ثبت‌شده' : 'الان چه حالی داری؟'}
                 </Text>
              </View>
              <View style={styles.modalIcon}>
                <Feather name="feather" size={19} color={colors.primary} />
              </View>
            </View>

            <Text style={styles.modalLabel}>حال امروز</Text>
            <View style={styles.moodGrid}>
              {moodOptions.map((mood) => {
                const isSelected = mood.value === selectedMood;
                return (
                  <Pressable
                    key={mood.value}
                    testID={`track-mood-${mood.value}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => onMoodChange(mood.value)}
                    style={({ pressed }) => [
                      styles.moodOption,
                      isSelected && styles.moodOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Feather
                      name={mood.icon}
                      size={16}
                      color={isSelected ? colors.primaryForeground : colors.primary}
                    />
                    <Text
                      style={[
                        styles.moodOptionText,
                        isSelected && styles.moodOptionTextSelected,
                      ]}
                    >
                      {mood.value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>یادداشت کوتاه</Text>
            <TextInput
              testID="track-mood-note"
              multiline
              value={note}
              onChangeText={onNoteChange}
              placeholder="این قطعه امروز تو را به کجا می‌برد؟"
              placeholderTextColor={colors.mutedForeground}
              selectionColor={colors.primary}
              style={styles.modalNoteInput}
              textAlign="right"
              textAlignVertical="top"
              maxLength={500}
            />

            {message ? <Text style={styles.modalMessage}>{message}</Text> : null}

            <Pressable
              testID="track-mood-submit"
              accessibilityRole="button"
              disabled={saving}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.modalSubmit,
                (pressed || saving) && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="check" size={18} color={colors.primaryForeground} />
                   <Text style={styles.modalSubmitText}>
                     {editing ? 'ذخیره‌ی ویرایش' : 'ثبت در دفترچه'}
                   </Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatDiaryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'زمان ثبت نامشخص';
  try {
    return `${date.toLocaleDateString('fa-IR')}، ${date.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return date.toLocaleDateString();
  }
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    loading: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },
    artworkCard: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 26,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 24,
      elevation: 5,
    },
    artwork: { width: '100%', height: '100%' },
    artworkFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      gap: 10,
    },
    artworkFallbackText: {
      color: colors.accentForeground,
      fontSize: 14,
      fontWeight: '700',
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
    diaryBlock: { paddingTop: 16 },
    generalNoteBlock: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    generalNoteCaption: {
      color: colors.mutedForeground,
      fontSize: 11,
      textAlign: 'right',
      marginTop: 4,
      marginBottom: 9,
    },
    generalNoteInput: {
      minHeight: 104,
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
    diaryHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    diaryHeaderCopy: { flex: 1, alignItems: 'flex-end' },
    diaryCaption: {
      color: colors.mutedForeground,
      fontSize: 11,
      textAlign: 'right',
      marginTop: 4,
    },
    diaryIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    timeline: { paddingTop: 3 },
    timelineEntry: {
      flexDirection: 'row-reverse',
      alignItems: 'stretch',
      minHeight: 92,
    },
    timelineRail: {
      width: 22,
      alignItems: 'center',
      marginLeft: 8,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
      marginTop: 6,
      zIndex: 1,
    },
    timelineLine: {
      position: 'absolute',
      top: 14,
      bottom: 0,
      width: 1,
      backgroundColor: colors.border,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: 17,
    },
    timelineMeta: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    timelineMetaActions: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 7,
    },
    timelineDate: {
      flex: 1,
      color: colors.mutedForeground,
      fontSize: 10,
      textAlign: 'left',
    },
    moodBadge: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    moodBadgeText: {
      color: colors.accentForeground,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'right',
    },
    timelineDelete: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    timelineEdit: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    timelineNote: {
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 21,
      textAlign: 'right',
      marginTop: 8,
    },
    emptyDiary: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
      backgroundColor: colors.secondary,
      borderRadius: 15,
      marginBottom: 12,
    },
    emptyDiaryTitle: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 9,
    },
    emptyDiaryText: {
      color: colors.mutedForeground,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 5,
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
    audioPlayerCard: {
      minHeight: 78,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 11,
      backgroundColor: colors.accent,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      marginBottom: 24,
    },
    audioPlayerIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    audioPlayerCopy: { flex: 1, alignItems: 'flex-end' },
    audioPlayerTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    audioPlayerSubtitle: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 4 },
    audioPlayerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    audioPlayerButtonDisabled: { opacity: 0.55 },
    listenCount: {
      color: colors.mutedForeground,
      fontSize: 11,
      textAlign: 'right',
      marginTop: -14,
      marginBottom: 23,
      paddingHorizontal: 3,
    },
    lyricsPreview: {
      color: colors.foreground,
      fontSize: 15,
      lineHeight: 29,
      textAlign: 'right',
      backgroundColor: colors.secondary,
      borderRadius: 15,
      paddingHorizontal: 15,
      paddingVertical: 14,
    },
    secondaryAction: {
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
    },
    secondaryActionText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    postcardAction: {
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 9,
    },
    postcardActionText: {
      color: colors.primaryForeground,
      fontSize: 13,
      fontWeight: '700',
    },
    sheetPreviewButton: {
      minHeight: 190,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.secondary,
      position: 'relative',
    },
    sheetPreview: {
      width: '100%',
      height: 190,
    },
    sheetPreviewOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      minHeight: 46,
      backgroundColor: 'rgba(0, 0, 0, 0.58)',
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    sheetPreviewText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.64)',
    },
    modalContentContainer: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      paddingTop: 40,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
    },
    modalTopRow: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-start',
      marginBottom: 22,
    },
    modalClose: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    modalTitleCopy: { flex: 1, alignItems: 'flex-end' },
    modalEyebrow: {
      color: colors.mutedForeground,
      fontSize: 11,
      textAlign: 'right',
      marginBottom: 5,
    },
    modalTitle: {
      color: colors.foreground,
      fontSize: 21,
      fontWeight: '700',
      textAlign: 'right',
    },
    modalIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    modalLabel: {
      color: colors.foreground,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'right',
      marginBottom: 9,
    },
    moodGrid: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: 9,
      marginBottom: 20,
    },
    moodOption: {
      flexGrow: 1,
      flexBasis: '45%',
      minHeight: 44,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 10,
    },
    moodOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    moodOptionText: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '600',
    },
    moodOptionTextSelected: { color: colors.primaryForeground },
    modalNoteInput: {
      minHeight: 112,
      borderWidth: 1,
      borderColor: colors.input,
      backgroundColor: colors.secondary,
      borderRadius: 15,
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 22,
      paddingHorizontal: 14,
      paddingTop: 13,
      marginBottom: 10,
    },
    modalMessage: {
      color: colors.destructive,
      fontSize: 12,
      textAlign: 'right',
      marginBottom: 10,
    },
    modalSubmit: {
      minHeight: 50,
      borderRadius: 15,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    modalSubmitText: {
      color: colors.primaryForeground,
      fontSize: 13,
      fontWeight: '700',
    },
    fullModalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
    },
    fullModalCard: {
      maxHeight: '90%',
      minHeight: '70%',
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 24,
    },
    fullModalHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-start',
      marginBottom: 18,
    },
    fullModalTitleCopy: { flex: 1, alignItems: 'flex-end' },
    fullModalTitle: {
      color: colors.foreground,
      fontSize: 19,
      lineHeight: 27,
      fontWeight: '700',
      textAlign: 'right',
    },
    lyricsContent: {
      flexGrow: 1,
      paddingVertical: 10,
    },
    lyricsText: {
      color: colors.foreground,
      fontSize: 17,
      lineHeight: 34,
      textAlign: 'right',
      writingDirection: 'rtl',
      paddingHorizontal: 4,
      paddingBottom: 20,
    },
    sheetModalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
    },
    sheetModalCard: {
      maxHeight: '92%',
      minHeight: '70%',
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetFullImage: {
      flex: 1,
      width: '100%',
      minHeight: 320,
      backgroundColor: colors.secondary,
      borderRadius: 15,
    },
    pressed: { opacity: 0.72 },
    versionsRow: {
      flexDirection: 'row',
      gap: 11,
      paddingBottom: 4,
    },
    versionCard: {
      width: 178,
      minHeight: 245,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    versionArtwork: {
      width: '100%',
      height: 125,
      backgroundColor: colors.secondary,
    },
    versionArtworkFallback: {
      width: '100%',
      height: 125,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    versionCopy: {
      flex: 1,
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingTop: 11,
      paddingBottom: 7,
    },
    versionTitle: {
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
      textAlign: 'right',
    },
    versionArtist: {
      color: colors.primary,
      fontSize: 11,
      textAlign: 'right',
      marginTop: 6,
    },
    versionAlbum: {
      color: colors.mutedForeground,
      fontSize: 10,
      textAlign: 'right',
      marginTop: 4,
    },
  });
}