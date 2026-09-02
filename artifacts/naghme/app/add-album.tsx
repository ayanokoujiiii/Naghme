import { router } from 'expo-router';
import { useState } from 'react';
import { FormField, FormMessage, ArchiveFormPage, SaveButton } from '@/components/ArchiveForm';
import { addAlbum } from '@/src/db/queries';

export default function AddAlbumScreen() {
  const [title, setTitle] = useState<string>('');
  const [releaseYear, setReleaseYear] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

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
      await addAlbum({ title, releaseYear: parsedYear, coverImage: null });
      setSuccess('آلبوم با موفقیت به آرشیو اضافه شد.');
      setTimeout(() => router.back(), 650);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی آلبوم انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArchiveFormPage title="افزودن آلبوم" subtitle="یک مجموعه‌ی تازه ثبت کن">
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
      <SaveButton label="ذخیره‌ی آلبوم" saving={saving} onPress={handleSave} />
    </ArchiveFormPage>
  );
}