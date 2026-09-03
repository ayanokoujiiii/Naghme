import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FormField, FormMessage, ArchiveFormPage, SaveButton } from '@/components/ArchiveForm';
import { addArtist, getArtistById, updateArtist } from '@/src/db/queries';

export default function AddArtistScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [genres, setGenres] = useState<string>('');
  const [biography, setBiography] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loadingRecord, setLoadingRecord] = useState<boolean>(editing);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    getArtistById(id)
      .then((artist) => {
        if (!mounted) return;
        if (!artist) {
          setError('هنرمند پیدا نشد.');
        } else {
          setName(artist.name);
          setType(artist.type ?? '');
          setGenres(artist.genres ?? '');
          setBiography(artist.biography ?? '');
        }
      })
      .catch((loadError: unknown) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'خواندن هنرمند انجام نشد.');
        }
      })
      .finally(() => {
        if (mounted) setLoadingRecord(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('نام هنرمند الزامی است.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (id) {
        await updateArtist(id, {
          name,
          type: type.trim() || null,
          genres: genres.trim() || null,
          biography: biography.trim() || null,
        });
      } else {
        await addArtist({
          name,
          type: type.trim() || null,
          genres: genres.trim() || null,
          biography: biography.trim() || null,
          image: null,
          profileImage: null,
        });
      }
      setSuccess(editing ? 'تغییرات هنرمند ذخیره شد.' : 'هنرمند با موفقیت به آرشیو اضافه شد.');
      setTimeout(() => router.back(), 650);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی هنرمند انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArchiveFormPage
      title={editing ? 'ویرایش هنرمند' : 'افزودن هنرمند'}
      subtitle={editing ? 'جزئیات هنرمند را به‌روز کن' : 'یک صدای تازه به آرشیوت اضافه کن'}
    >
      <FormMessage error={error} success={success} />
      <FormField
        label="نام هنرمند"
        placeholder="مثلاً محمدرضا شجریان"
        value={name}
        onChangeText={setName}
        autoFocus
        error={error && !name.trim() ? error : undefined}
      />
      <FormField
        label="نوع"
        placeholder="خواننده، گروه، آهنگساز..."
        value={type}
        onChangeText={setType}
      />
      <FormField
        label="سبک‌ها"
        placeholder="مثلاً سنتی، جَز"
        value={genres}
        onChangeText={setGenres}
      />
      <FormField
        label="یادداشت کوتاه"
        placeholder="چه چیزی این هنرمند را برایت خاص می‌کند؟"
        value={biography}
        onChangeText={setBiography}
        multiline
      />
      <SaveButton
        label={editing ? 'ذخیره‌ی تغییرات' : 'ذخیره‌ی هنرمند'}
        saving={saving || loadingRecord}
        onPress={handleSave}
      />
    </ArchiveFormPage>
  );
}