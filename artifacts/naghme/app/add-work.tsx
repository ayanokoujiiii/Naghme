import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArchiveFormPage, FormField, FormMessage, SaveButton } from '@/components/ArchiveForm';
import { createWork, getWorkById, updateWork } from '@/src/db/queries';

export default function AddWorkScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const [title, setTitle] = useState<string>('');
  const [alternateTitles, setAlternateTitles] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  const [genre, setGenre] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(editing);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    getWorkById(id)
      .then((work) => {
        if (!mounted) return;
        if (!work) {
          setError('اثر پیدا نشد.');
          return;
        }
        setTitle(work.title);
        setAlternateTitles(work.alternateTitles ?? '');
        setLanguage(work.language ?? '');
        setGenre(work.genre ?? '');
        setDescription(work.description ?? '');
      })
      .catch((loadError: unknown) => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'خواندن اثر انجام نشد.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('عنوان اثر الزامی است.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const input = {
        title,
        alternateTitles: alternateTitles.trim() || null,
        language: language.trim() || null,
        genre: genre.trim() || null,
        description: description.trim() || null,
      };
      if (id) await updateWork(id, input);
      else await createWork(input);
      setSuccess(editing ? 'تغییرات اثر ذخیره شد.' : 'اثر با موفقیت اضافه شد.');
      setTimeout(() => router.back(), 650);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی اثر انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArchiveFormPage
      title={editing ? 'ویرایش اثر' : 'افزودن اثر'}
      subtitle={editing ? 'اطلاعات اثر را به‌روز کن' : 'یک اثر ماندگار ثبت کن'}
    >
      <FormMessage error={error} success={success} />
      <FormField
        label="عنوان اثر"
        placeholder="مثلاً مرغ سحر"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />
      <FormField
        label="عنوان‌های جایگزین"
        placeholder="عنوان‌های دیگر را با ویرگول جدا کن"
        value={alternateTitles}
        onChangeText={setAlternateTitles}
      />
      <FormField label="زبان" placeholder="مثلاً فارسی" value={language} onChangeText={setLanguage} />
      <FormField label="ژانر" placeholder="مثلاً تصنیف، کلاسیک" value={genre} onChangeText={setGenre} />
      <FormField
        label="توضیحات"
        placeholder="زمینه، تاریخچه یا یادداشت مربوط به این اثر"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={6}
      />
      <SaveButton
        label={editing ? 'ذخیره‌ی تغییرات' : 'ذخیره‌ی اثر'}
        saving={saving || loading}
        onPress={handleSave}
      />
    </ArchiveFormPage>
  );
}