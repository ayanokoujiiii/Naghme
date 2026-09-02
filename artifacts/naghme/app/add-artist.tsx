import { router } from 'expo-router';
import { useState } from 'react';
import { FormField, FormMessage, ArchiveFormPage, SaveButton } from '@/components/ArchiveForm';
import { addArtist } from '@/src/db/queries';

export default function AddArtistScreen() {
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [genres, setGenres] = useState<string>('');
  const [biography, setBiography] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('نام هنرمند الزامی است.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await addArtist({
        name,
        type: type.trim() || null,
        genres: genres.trim() || null,
        biography: biography.trim() || null,
        image: null,
      });
      setSuccess('هنرمند با موفقیت به آرشیو اضافه شد.');
      setTimeout(() => router.back(), 650);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی هنرمند انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArchiveFormPage title="افزودن هنرمند" subtitle="یک صدای تازه به آرشیوت اضافه کن">
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
      <SaveButton label="ذخیره‌ی هنرمند" saving={saving} onPress={handleSave} />
    </ArchiveFormPage>
  );
}