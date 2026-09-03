import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArchiveFormPage, FormField, FormMessage, SaveButton } from '@/components/ArchiveForm';
import {
  createVersion,
  getVersionById,
  updateVersion,
} from '@/src/db/queries';

export default function AddVersionScreen() {
  const { id, workId } = useLocalSearchParams<{ id?: string; workId?: string }>();
  const editing = Boolean(id);
  const [name, setName] = useState<string>('');
  const [kind, setKind] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [resolvedWorkId, setResolvedWorkId] = useState<string>(workId ?? '');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(editing);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    getVersionById(id)
      .then((version) => {
        if (!mounted) return;
        if (!version) {
          setError('نسخه پیدا نشد.');
          return;
        }
        setResolvedWorkId(version.workId);
        setName(version.name);
        setKind(version.kind ?? '');
        setDescription(version.description ?? '');
      })
      .catch((loadError: unknown) => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'خواندن نسخه انجام نشد.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (!resolvedWorkId) {
      setError('اثر مرتبط با نسخه پیدا نشد.');
      return;
    }
    if (!name.trim()) {
      setError('نام نسخه الزامی است.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const input = {
        name,
        kind: kind.trim() || null,
        description: description.trim() || null,
      };
      if (id) await updateVersion(id, input);
      else await createVersion({ ...input, workId: resolvedWorkId });
      setSuccess(editing ? 'تغییرات نسخه ذخیره شد.' : 'نسخه با موفقیت اضافه شد.');
      setTimeout(() => router.back(), 650);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره‌ی نسخه انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ArchiveFormPage
      title={editing ? 'ویرایش نسخه' : 'افزودن نسخه'}
      subtitle="یک اجرای مشخص از این اثر را ثبت کن"
    >
      <FormMessage error={error} success={success} />
      <FormField
        label="نام نسخه"
        placeholder="مثلاً اجرای استودیویی ۱۳۷۵"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <FormField
        label="نوع نسخه"
        placeholder="مثلاً اصلی، بازخوانی، اجرای زنده"
        value={kind}
        onChangeText={setKind}
      />
      <FormField
        label="توضیحات"
        placeholder="اطلاعاتی درباره‌ی این اجرا یا تنظیم"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={6}
      />
      <SaveButton
        label={editing ? 'ذخیره‌ی تغییرات' : 'ذخیره‌ی نسخه'}
        saving={saving || loading}
        onPress={handleSave}
      />
    </ArchiveFormPage>
  );
}