import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FormField, FormMessage, ArchiveFormPage, SaveButton } from '@/components/ArchiveForm';
import { CreditsManager, PendingCreditDraft } from '@/components/CreditsManager';
import { useColors } from '@/hooks/useColors';
import {
  AlbumTrackRecord,
  ArtistRecord,
  createAlbumWithCredits,
  getAlbumArtistLinks,
  getAlbumById,
  getAlbumTracks,
  getArtists,
  getTracks,
  NewAlbumTrack,
  replaceAlbumArtists,
  replaceAlbumTracks,
  TrackRecord,
  updateAlbum,
} from '@/src/db/queries';

type AlbumTrackDraft = {
  trackId: string;
  title: string;
  discNumber: string;
  trackNumber: string;
};

export default function AddAlbumScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState<string>('');
  const [releaseYear, setReleaseYear] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loadingRecord, setLoadingRecord] = useState<boolean>(editing);
  const [pendingCredits, setPendingCredits] = useState<PendingCreditDraft[]>([]);
  const [allTracks, setAllTracks] = useState<TrackRecord[]>([]);
  const [allArtists, setAllArtists] = useState<ArtistRecord[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [artistPickerOpen, setArtistPickerOpen] = useState<boolean>(false);
  const [albumTracks, setAlbumTracks] = useState<AlbumTrackDraft[]>([]);
  const [trackPickerOpen, setTrackPickerOpen] = useState<boolean>(false);
  const [loadingTracks, setLoadingTracks] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getTracks(),
      getArtists(),
      id ? getAlbumById(id) : Promise.resolve(null),
      id ? getAlbumTracks(id) : Promise.resolve([]),
      id ? getAlbumArtistLinks(id) : Promise.resolve([]),
    ])
      .then(([trackItems, artistItems, album, existingTracks, existingArtists]) => {
        if (!mounted) return;
        setAllTracks(trackItems);
        setAllArtists(artistItems);
        setSelectedArtistIds(existingArtists.map((link) => link.artistId));
        setAlbumTracks(existingTracks.map(toDraft));
        if (!album) {
          if (id) setError('آلبوم پیدا نشد.');
        } else {
          setTitle(album.title);
          setReleaseYear(album.releaseYear?.toString() ?? '');
        }
      })
      .catch((loadError: unknown) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'خواندن آلبوم انجام نشد.');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingRecord(false);
          setLoadingTracks(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const availableTracks = allTracks.filter(
    (track) => !albumTracks.some((albumTrack) => albumTrack.trackId === track.id),
  );

  const selectedArtists = allArtists.filter((artist) => selectedArtistIds.includes(artist.id));

  const toggleArtist = (artistId: string) => {
    setSelectedArtistIds((current) =>
      current.includes(artistId)
        ? current.filter((idValue) => idValue !== artistId)
        : [...current, artistId],
    );
  };

  const addTrackToAlbum = (track: TrackRecord) => {
    setAlbumTracks((current) => [
      ...current,
      {
        trackId: track.id,
        title: track.title,
        discNumber: '1',
        trackNumber: String(current.length + 1),
      },
    ]);
    setTrackPickerOpen(false);
  };

  const removeTrackFromAlbum = (trackId: string) => {
    setAlbumTracks((current) => current.filter((track) => track.trackId !== trackId));
  };

  const moveTrack = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= albumTracks.length) return;
    setAlbumTracks((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next.map((track, trackIndex) => ({
        ...track,
        trackNumber: String(trackIndex + 1),
      }));
    });
  };

  const updateTrackPosition = (
    trackId: string,
    field: 'discNumber' | 'trackNumber',
    value: string,
  ) => {
    setAlbumTracks((current) =>
      current.map((track) => (track.trackId === trackId ? { ...track, [field]: value } : track)),
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('عنوان آلبوم الزامی است.');
      return;
    }
    const parsedYear = releaseYear.trim() ? Number(releaseYear.trim()) : null;
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 0)) {
      setError('سال انتشار باید یک عدد صحیح معتبر باشد.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const entries: NewAlbumTrack[] = albumTracks.map((track) => {
        const discNumber = track.discNumber.trim() ? Number(track.discNumber) : null;
        const trackNumber = track.trackNumber.trim() ? Number(track.trackNumber) : null;
        if (
          (discNumber !== null && (!Number.isInteger(discNumber) || discNumber < 1)) ||
          (trackNumber !== null && (!Number.isInteger(trackNumber) || trackNumber < 1)) ||
          (discNumber === null) !== (trackNumber === null)
        ) {
          throw new Error('شمارهٔ دیسک و قطعه باید عدد صحیح مثبت باشند یا هر دو خالی باشند.');
        }
        return { albumId: id ?? '', trackId: track.trackId, discNumber, trackNumber };
      });
      if (id) {
        await updateAlbum(id, { title, releaseYear: parsedYear });
        await replaceAlbumArtists(id, selectedArtistIds);
        await replaceAlbumTracks(id, entries.map((entry) => ({ ...entry, albumId: id })));
      } else {
        const createdAlbum = await createAlbumWithCredits(
          { title, releaseYear: parsedYear, coverImage: null },
          pendingCredits.map(({ id: _id, ...credit }) => credit),
        );
        await replaceAlbumArtists(createdAlbum.id, selectedArtistIds);
        await replaceAlbumTracks(
          createdAlbum.id,
          entries.map((entry) => ({ ...entry, albumId: createdAlbum.id })),
        );
      }
      setSuccess(editing ? 'تغییرات آلبوم ذخیره شد.' : 'آلبوم با موفقیت به آرشیو اضافه شد.');
      setTimeout(() => router.back(), 650);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی آلبوم انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArchiveFormPage
      title={editing ? 'ویرایش آلبوم' : 'افزودن آلبوم'}
      subtitle={editing ? 'جزئیات آلبوم را به‌روز کن' : 'یک مجموعه‌ی تازه ثبت کن'}
    >
      <FormMessage error={error} success={success} />
      <FormField
        label="عنوان آلبوم"
        placeholder="نام آلبوم"
        value={title}
        onChangeText={setTitle}
        autoFocus
        error={error && !title.trim() ? error : undefined}
      />
      <FormField
        label="سال انتشار"
        placeholder="اختیاری"
        value={releaseYear}
        onChangeText={setReleaseYear}
        keyboardType="number-pad"
      />
      <View style={styles.artistSection}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>هنرمندان آلبوم</Text>
            <Text style={styles.sectionHint}>یک یا چند هنرمند را به‌صورت صریح متصل کن</Text>
          </View>
          <Pressable
            testID="album-toggle-artist-picker"
            accessibilityRole="button"
            onPress={() => setArtistPickerOpen((open) => !open)}
            style={({ pressed }) => [styles.addTrackButton, pressed && styles.pressed]}
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={styles.addTrackText}>افزودن</Text>
          </Pressable>
        </View>
        {selectedArtists.length ? (
          <View style={styles.selectedArtists}>
            {selectedArtists.map((artist) => (
              <View key={artist.id} style={styles.artistChip}>
                <Pressable
                  testID={`album-remove-artist-${artist.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`حذف ${artist.name} از آلبوم`}
                  onPress={() => toggleArtist(artist.id)}
                  style={styles.artistChipRemove}
                >
                  <Feather name="x" size={13} color={colors.destructive} />
                </Pressable>
                <Text style={styles.artistChipText}>{artist.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noArtistText}>هنوز هنرمندی برای این آلبوم انتخاب نشده است.</Text>
        )}
        {artistPickerOpen ? (
          <View style={styles.artistMenu}>
            {allArtists.length ? allArtists.map((artist) => (
              <Pressable
                key={artist.id}
                testID={`album-artist-option-${artist.id}`}
                onPress={() => toggleArtist(artist.id)}
                style={styles.artistMenuItem}
              >
                <Feather
                  name={selectedArtistIds.includes(artist.id) ? 'check-square' : 'square'}
                  size={17}
                  color={selectedArtistIds.includes(artist.id) ? colors.primary : colors.mutedForeground}
                />
                <Text style={styles.artistMenuText}>{artist.name}</Text>
              </Pressable>
            )) : <Text style={styles.noArtistText}>ابتدا یک هنرمند ثبت کن.</Text>}
          </View>
        ) : null}
      </View>
      <View style={styles.trackSection}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>قطعه‌های آلبوم</Text>
            <Text style={styles.sectionHint}>ترتیب و شماره‌ی دیسک را مشخص کن</Text>
          </View>
          <Pressable
            testID="album-add-track"
            accessibilityRole="button"
            disabled={loadingTracks || availableTracks.length === 0}
            onPress={() => setTrackPickerOpen((open) => !open)}
            style={({ pressed }) => [
              styles.addTrackButton,
              (pressed || loadingTracks || availableTracks.length === 0) && styles.pressed,
            ]}
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
            <Text style={styles.addTrackText}>افزودن قطعه</Text>
          </Pressable>
        </View>
        {trackPickerOpen ? (
          <View style={styles.trackMenu}>
            {availableTracks.length ? availableTracks.map((track) => (
              <Pressable
                key={track.id}
                onPress={() => addTrackToAlbum(track)}
                style={styles.trackMenuItem}
              >
                <Text style={styles.trackMenuText}>{track.title}</Text>
              </Pressable>
            )) : <Text style={styles.emptyTrackText}>همه‌ی قطعه‌ها به آلبوم اضافه شده‌اند.</Text>}
          </View>
        ) : null}
        <View style={styles.trackList}>
          {loadingTracks ? (
            <Text style={styles.emptyTrackText}>در حال خواندن قطعه‌ها…</Text>
          ) : albumTracks.length ? albumTracks.map((track, index) => (
            <View key={track.trackId} style={styles.trackEditor}>
              <View style={styles.trackEditorActions}>
                <Pressable
                  testID={`album-track-up-${track.trackId}`}
                  accessibilityLabel="بالا بردن قطعه"
                  onPress={() => moveTrack(index, -1)}
                  disabled={index === 0}
                  style={({ pressed }) => [styles.iconButton, (pressed || index === 0) && styles.pressed]}
                >
                  <Feather name="chevron-up" size={17} color={index === 0 ? colors.mutedForeground : colors.primary} />
                </Pressable>
                <Pressable
                  testID={`album-track-down-${track.trackId}`}
                  accessibilityLabel="پایین بردن قطعه"
                  onPress={() => moveTrack(index, 1)}
                  disabled={index === albumTracks.length - 1}
                  style={({ pressed }) => [styles.iconButton, (pressed || index === albumTracks.length - 1) && styles.pressed]}
                >
                  <Feather name="chevron-down" size={17} color={index === albumTracks.length - 1 ? colors.mutedForeground : colors.primary} />
                </Pressable>
                <Pressable
                  testID={`album-track-remove-${track.trackId}`}
                  accessibilityLabel="حذف قطعه از آلبوم"
                  onPress={() => removeTrackFromAlbum(track.trackId)}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
              </View>
              <View style={styles.trackEditorCopy}>
                <Text style={styles.trackEditorTitle} numberOfLines={1}>{track.title}</Text>
                <View style={styles.positionFields}>
                  <FormField
                    label="شماره قطعه"
                    value={track.trackNumber}
                    onChangeText={(value) => updateTrackPosition(track.trackId, 'trackNumber', value)}
                    keyboardType="number-pad"
                  />
                  <FormField
                    label="دیسک"
                    value={track.discNumber}
                    onChangeText={(value) => updateTrackPosition(track.trackId, 'discNumber', value)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          )) : <Text style={styles.emptyTrackText}>هنوز قطعه‌ای برای این آلبوم انتخاب نشده است.</Text>}
        </View>
      </View>
      <CreditsManager
        targetId={id}
        targetType="album"
        pendingCredits={pendingCredits}
        onPendingCreditsChange={setPendingCredits}
      />
      <SaveButton
        label={editing ? 'ذخیره‌ی تغییرات' : 'ذخیره‌ی آلبوم'}
        saving={saving || loadingRecord}
        onPress={handleSave}
      />
    </ArchiveFormPage>
  );
}

function toDraft(track: AlbumTrackRecord): AlbumTrackDraft {
  return {
    trackId: track.id,
    title: track.title,
    discNumber: track.discNumber?.toString() ?? '',
    trackNumber: track.trackNumber?.toString() ?? '',
  };
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    artistSection: { marginBottom: 20 },
    selectedArtists: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
    artistChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 14, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
    artistChipText: { color: colors.foreground, fontSize: 11, fontWeight: '700' },
    artistChipRemove: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
    artistMenu: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, borderRadius: 15, overflow: 'hidden', marginTop: 4 },
    artistMenuItem: { minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    artistMenuText: { flex: 1, color: colors.foreground, fontSize: 13, textAlign: 'right' },
    noArtistText: { color: colors.mutedForeground, fontSize: 12, lineHeight: 20, paddingVertical: 7, textAlign: 'right' },
    trackSection: { marginBottom: 20 },
    sectionHeading: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
    },
    sectionCopy: { flex: 1, alignItems: 'flex-end' },
    sectionTitle: { color: colors.foreground, fontSize: 17, fontWeight: '700', textAlign: 'right' },
    sectionHint: { color: colors.mutedForeground, fontSize: 11, marginTop: 4, textAlign: 'right' },
    addTrackButton: {
      minHeight: 38,
      borderRadius: 13,
      paddingHorizontal: 11,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
    },
    addTrackText: { color: colors.primaryForeground, fontSize: 11, fontWeight: '700' },
    trackMenu: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      borderRadius: 15,
      overflow: 'hidden',
      marginBottom: 9,
    },
    trackMenuItem: {
      minHeight: 46,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    trackMenuText: { color: colors.foreground, fontSize: 13, textAlign: 'right' },
    trackList: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 12,
    },
    trackEditor: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    trackEditorCopy: { flex: 1 },
    trackEditorTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    trackEditorActions: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 2 },
    iconButton: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
    positionFields: { flexDirection: 'row', gap: 8, marginTop: 5 },
    emptyTrackText: { color: colors.mutedForeground, fontSize: 12, lineHeight: 20, padding: 6, textAlign: 'right' },
    pressed: { opacity: 0.55 },
  });
}