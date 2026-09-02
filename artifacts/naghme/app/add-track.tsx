import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormField, FormMessage, ArchiveFormPage, SaveButton } from '@/components/ArchiveForm';
import { useColors } from '@/hooks/useColors';
import {
  addTrack,
  AlbumRecord,
  ArtistRecord,
  getArtists,
  getAlbums,
  getTrackById,
  updateTrack,
} from '@/src/db/queries';

export default function AddTrackScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [versionName, setVersionName] = useState<string>('');
  const [lyrics, setLyrics] = useState<string>('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>('');
  const [sheetMusicUri, setSheetMusicUri] = useState<string | null>(null);
  const [artists, setArtists] = useState<ArtistRecord[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [albums, setAlbums] = useState<AlbumRecord[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [artistPickerOpen, setArtistPickerOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loadingRecord, setLoadingRecord] = useState<boolean>(editing);

  useEffect(() => {
    let mounted = true;
    Promise.all([getArtists(), getAlbums(), id ? getTrackById(id) : Promise.resolve(null)])
      .then(([artistItems, albumItems, track]) => {
        if (!mounted) return;
        setArtists(artistItems);
        setAlbums(albumItems);
        if (id) {
          if (!track) {
            setError('قطعه پیدا نشد.');
          } else {
            setTitle(track.title);
            setDuration(track.duration?.toString() ?? '');
            setVersionName(track.versionName ?? '');
            setLyrics(track.lyrics ?? '');
            setSelectedArtistId(track.artistId);
            setSelectedAlbumId(track.albumId);
            setAudioUri(track.audioUri);
            setAudioName(track.audioUri ? 'فایل صوتی انتخاب‌شده' : '');
            setSheetMusicUri(track.sheetMusicUri);
          }
        }
      })
      .catch((loadError: unknown) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'خواندن قطعه انجام نشد.');
        }
      })
      .finally(() => {
        if (mounted) setLoadingRecord(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId);
  const selectedArtist = artists.find((artist) => artist.id === selectedArtistId);

  const pickAudio = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('انتخاب صوت در دسترس نیست', 'انتخاب فایل صوتی را در برنامه‌ی Android انجام بده.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) throw new Error('فایل صوتی انتخاب نشد.');
      setAudioUri(asset.uri);
      setAudioName(asset.name || 'فایل صوتی انتخاب‌شده');
      setError('');
    } catch (pickError: unknown) {
      Alert.alert(
        'انتخاب فایل انجام نشد',
        pickError instanceof Error ? pickError.message : 'فایل صوتی انتخاب نشد.',
      );
    }
  };

  const clearAudio = () => {
    setAudioUri(null);
    setAudioName('');
  };

  const pickSheetMusic = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('انتخاب تصویر در دسترس نیست', 'انتخاب تصویر نت را در برنامه‌ی Android انجام بده.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error('تصویر نت انتخاب نشد.');
      setSheetMusicUri(asset.uri);
      setError('');
    } catch (pickError: unknown) {
      Alert.alert(
        'انتخاب تصویر انجام نشد',
        pickError instanceof Error ? pickError.message : 'تصویر نت انتخاب نشد.',
      );
    }
  };

  const clearSheetMusic = () => setSheetMusicUri(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('عنوان قطعه الزامی است.');
      return;
    }
    const parsedDuration = duration.trim() ? Number(duration.trim()) : null;
    if (
      parsedDuration !== null &&
      (!Number.isInteger(parsedDuration) || parsedDuration < 0)
    ) {
      setError('مدت‌زمان باید به‌صورت تعداد ثانیه وارد شود.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (id) {
        await updateTrack(id, {
          title,
          duration: parsedDuration,
          artistId: selectedArtistId,
          albumId: selectedAlbumId,
          audioUri,
           versionName: versionName.trim() || null,
           lyrics: lyrics.trim() || null,
           sheetMusicUri,
        });
      } else {
        await addTrack({
          title,
          duration: parsedDuration,
          artistId: selectedArtistId,
          albumId: selectedAlbumId,
          audioUri,
          coverImage: null,
           versionName: versionName.trim() || null,
           lyrics: lyrics.trim() || null,
           sheetMusicUri,
        });
      }
      setSuccess(editing ? 'تغییرات قطعه ذخیره شد.' : 'قطعه با موفقیت به آرشیو اضافه شد.');
      setTimeout(() => router.back(), 650);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی قطعه انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArchiveFormPage
      title={editing ? 'ویرایش قطعه' : 'افزودن قطعه'}
      subtitle={editing ? 'جزئیات قطعه را به‌روز کن' : 'یک نغمه‌ی تازه ثبت کن'}
    >
      <FormMessage error={error} success={success} />
      <FormField
        label="عنوان قطعه"
        placeholder="نام قطعه"
        value={title}
        onChangeText={setTitle}
        autoFocus
        error={error && !title.trim() ? error : undefined}
      />
      <FormField
        label="مدت‌زمان (ثانیه)"
        placeholder="اختیاری، مثلاً ۲۴۵"
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
      />
      <FormField
        label="نسخه / اجرا"
        placeholder="مثلاً اجرای زنده، نسخه‌ی استودیویی"
        value={versionName}
        onChangeText={setVersionName}
      />
      <FormField
        label="متن ترانه / تصنیف"
        placeholder="متن را اینجا بنویس یا جای‌گذاری کن…"
        value={lyrics}
        onChangeText={setLyrics}
        multiline
        numberOfLines={8}
        maxLength={12000}
      />

      <View style={styles.field}>
        <Text style={styles.label}>هنرمند</Text>
        <Pressable
          testID="artist-picker"
          onPress={() => setArtistPickerOpen((open) => !open)}
          style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
        >
          <Feather
            name={artistPickerOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.mutedForeground}
          />
          <Text style={[styles.pickerText, !selectedArtist && styles.placeholder]} numberOfLines={1}>
            {selectedArtist?.name ?? 'بدون هنرمند'}
          </Text>
        </Pressable>
        {artistPickerOpen ? (
          <View style={styles.menu}>
            <Pressable
              onPress={() => {
                setSelectedArtistId(null);
                setArtistPickerOpen(false);
              }}
              style={styles.menuItem}
            >
              <Text style={styles.menuText} numberOfLines={1}>بدون هنرمند</Text>
            </Pressable>
            {artists.length > 0 ? (
              artists.map((artist) => (
                <Pressable
                  key={artist.id}
                  onPress={() => {
                    setSelectedArtistId(artist.id);
                    setArtistPickerOpen(false);
                  }}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuText} numberOfLines={1}>{artist.name}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.noAlbums}>هنوز هنرمندی ثبت نشده است.</Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>آلبوم</Text>
        <Pressable
          testID="album-picker"
          onPress={() => setPickerOpen((open) => !open)}
          style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
        >
          <Feather
            name={pickerOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.mutedForeground}
          />
          <Text style={[styles.pickerText, !selectedAlbum && styles.placeholder]} numberOfLines={1}>
            {selectedAlbum?.title ?? 'بدون آلبوم'}
          </Text>
        </Pressable>
        {pickerOpen ? (
          <View style={styles.menu}>
            <Pressable
              onPress={() => {
                setSelectedAlbumId(null);
                setPickerOpen(false);
              }}
              style={styles.menuItem}
            >
              <Text style={styles.menuText} numberOfLines={1}>بدون آلبوم</Text>
            </Pressable>
            {albums.length > 0 ? (
              albums.map((album) => (
                <Pressable
                  key={album.id}
                  onPress={() => {
                    setSelectedAlbumId(album.id);
                    setPickerOpen(false);
                  }}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuText} numberOfLines={1}>{album.title}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.noAlbums}>هنوز آلبومی ثبت نشده است.</Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>فایل صوتی محلی</Text>
        <View style={styles.audioPickerCard}>
          <View style={styles.audioIcon}>
            <Feather name={audioUri ? 'volume-2' : 'music'} size={19} color={colors.primary} />
          </View>
          <View style={styles.audioCopy}>
            <Text style={styles.audioTitle} numberOfLines={1}>
              {audioName || (audioUri ? 'فایل صوتی انتخاب‌شده' : 'هنوز فایلی انتخاب نشده')}
            </Text>
            <Text style={styles.audioHint}>فایل روی همین دستگاه نگهداری می‌شود.</Text>
          </View>
          {audioUri ? (
            <Pressable
              testID="remove-audio"
              accessibilityRole="button"
              accessibilityLabel="حذف فایل صوتی"
              onPress={clearAudio}
              style={({ pressed }) => [styles.audioAction, pressed && styles.pressed]}
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          testID="pick-audio"
          accessibilityRole="button"
          accessibilityLabel="انتخاب فایل صوتی"
          onPress={() => void pickAudio()}
          style={({ pressed }) => [styles.audioButton, pressed && styles.pressed]}
        >
          <Feather name="folder" size={17} color={colors.primary} />
          <Text style={styles.audioButtonText}>{audioUri ? 'تغییر فایل صوتی' : 'انتخاب فایل صوتی'}</Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>نت موسیقی</Text>
        <View style={styles.audioPickerCard}>
          <View style={styles.audioIcon}>
            <Feather name={sheetMusicUri ? 'image' : 'file-text'} size={19} color={colors.primary} />
          </View>
          <View style={styles.audioCopy}>
            <Text style={styles.audioTitle} numberOfLines={1}>
              {sheetMusicUri ? 'تصویر نت انتخاب‌شده' : 'هنوز تصویری انتخاب نشده'}
            </Text>
            <Text style={styles.audioHint}>تصویر نت روی همین دستگاه نگهداری می‌شود.</Text>
          </View>
          {sheetMusicUri ? (
            <Pressable
              testID="remove-sheet-music"
              accessibilityRole="button"
              accessibilityLabel="حذف تصویر نت"
              onPress={clearSheetMusic}
              style={({ pressed }) => [styles.audioAction, pressed && styles.pressed]}
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          testID="pick-sheet-music"
          accessibilityRole="button"
          accessibilityLabel="انتخاب تصویر نت موسیقی"
          onPress={() => void pickSheetMusic()}
          style={({ pressed }) => [styles.audioButton, pressed && styles.pressed]}
        >
          <Feather name="image" size={17} color={colors.primary} />
          <Text style={styles.audioButtonText}>
            {sheetMusicUri ? 'تغییر تصویر نت' : 'انتخاب تصویر نت'}
          </Text>
        </Pressable>
      </View>

      <SaveButton
        label={editing ? 'ذخیره‌ی تغییرات' : 'ذخیره‌ی قطعه'}
        saving={saving || loadingRecord}
        onPress={handleSave}
      />
    </ArchiveFormPage>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    field: { marginBottom: 18 },
    label: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'right',
      marginBottom: 9,
    },
    picker: {
      minHeight: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.input,
      backgroundColor: colors.card,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
    },
    pickerText: {
      flex: 1,
      flexShrink: 1,
      color: colors.foreground,
      fontSize: 15,
      textAlign: 'right',
    },
    placeholder: { color: colors.mutedForeground },
    menu: {
      marginTop: 7,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      overflow: 'hidden',
    },
    menuItem: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuText: {
      color: colors.foreground,
      fontSize: 14,
      flexShrink: 1,
      textAlign: 'right',
    },
    noAlbums: {
      color: colors.mutedForeground,
      fontSize: 13,
      textAlign: 'right',
      padding: 16,
    },
    audioPickerCard: {
      minHeight: 68,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
    },
    audioIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    audioCopy: { flex: 1, alignItems: 'flex-end' },
    audioTitle: { color: colors.foreground, fontSize: 13, fontWeight: '600', textAlign: 'right' },
    audioHint: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 3 },
    audioAction: { padding: 7 },
    audioButton: {
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 9,
    },
    audioButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    pressed: { opacity: 0.72 },
  });
}