import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FormField, FormMessage, ArchiveFormPage, SaveButton } from '@/components/ArchiveForm';
import { addAlbum, getAlbumById, updateAlbum } from '@/src/db/queries';

export default function AddAlbumScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const [title, setTitle] = useState<string>('');
  const [releaseYear, setReleaseYear] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loadingRecord, setLoadingRecord] = useState<boolean>(editing);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    getAlbumById(id)
      .then((album) => {
        if (!mounted) return;
        if (!album) {
          setError('آلبوم پیدا نشد.');
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
        if (mounted) setLoadingRecord(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

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
      if (id) {
        await updateAlbum(id, { title, releaseYear: parsedYear });
      } else {
        await addAlbum({ title, releaseYear: parsedYear, coverImage: null });
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
      <SaveButton
        label={editing ? 'ذخیره‌ی تغییرات' : 'ذخیره‌ی آلبوم'}
        saving={saving || loadingRecord}
        onPress={handleSave}
      />
    </ArchiveFormPage>
  );
}