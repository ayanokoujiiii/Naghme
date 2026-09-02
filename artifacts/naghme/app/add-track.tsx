import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FormField, FormMessage, ArchiveFormPage, SaveButton } from '@/components/ArchiveForm';
import { useColors } from '@/hooks/useColors';
import { addTrack, AlbumRecord, getAlbums } from '@/src/db/queries';

export default function AddTrackScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [albums, setAlbums] = useState<AlbumRecord[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    getAlbums()
      .then((items) => {
        if (mounted) setAlbums(items);
      })
      .catch(() => {
        if (mounted) setAlbums([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId);

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
      await addTrack({
        title,
        duration: parsedDuration,
        albumId: selectedAlbumId,
        audioUri: null,
        coverImage: null,
      });
      setSuccess('قطعه با موفقیت به آرشیو اضافه شد.');
      setTimeout(() => router.back(), 650);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی قطعه انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArchiveFormPage title="افزودن قطعه" subtitle="یک نغمه‌ی تازه ثبت کن">
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
          <Text style={[styles.pickerText, !selectedAlbum && styles.placeholder]}>
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
              <Text style={styles.menuText}>بدون آلبوم</Text>
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
                  <Text style={styles.menuText}>{album.title}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.noAlbums}>هنوز آلبومی ثبت نشده است.</Text>
            )}
          </View>
        ) : null}
      </View>
      <SaveButton label="ذخیره‌ی قطعه" saving={saving} onPress={handleSave} />
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
      textAlign: 'right',
    },
    noAlbums: {
      color: colors.mutedForeground,
      fontSize: 13,
      textAlign: 'right',
      padding: 16,
    },
    pressed: { opacity: 0.72 },
  });
}