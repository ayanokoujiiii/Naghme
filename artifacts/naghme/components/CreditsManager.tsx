import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import {
  addAlbumCredit,
  addTrackCredit,
  ArtistRecord,
  CreditViewRecord,
  getArtists,
  getCreditsForAlbum,
  getCreditsForTrack,
  getRoles,
  RoleRecord,
  updateCredit,
  removeCredit,
} from '@/src/db/queries';

type CreditsManagerProps = {
  targetId?: string;
  targetType: 'track' | 'album';
};

export function CreditsManager({ targetId, targetType }: CreditsManagerProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [artists, setArtists] = useState<ArtistRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [credits, setCredits] = useState<CreditViewRecord[]>([]);
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [editingCredit, setEditingCredit] = useState<CreditViewRecord | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [artistPickerOpen, setArtistPickerOpen] = useState<boolean>(false);
  const [rolePickerOpen, setRolePickerOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(Boolean(targetId));
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const load = async () => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [artistItems, roleItems, creditItems] = await Promise.all([
        getArtists(),
        getRoles(),
        targetType === 'track' ? getCreditsForTrack(targetId) : getCreditsForAlbum(targetId),
      ]);
      setArtists(artistItems);
      setRoles(roleItems);
      setCredits(creditItems);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن مشارکت‌ها انجام نشد.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [targetId, targetType]);

  const resetEditor = () => {
    setEditorOpen(false);
    setEditingCredit(null);
    setSelectedArtistId('');
    setSelectedRoleId('');
    setNotes('');
    setArtistPickerOpen(false);
    setRolePickerOpen(false);
  };

  const openNewEditor = () => {
    setError('');
    setSuccess('');
    setEditingCredit(null);
    setSelectedArtistId('');
    setSelectedRoleId('');
    setNotes('');
    setEditorOpen(true);
  };

  const openEditEditor = (credit: CreditViewRecord) => {
    setError('');
    setSuccess('');
    setEditingCredit(credit);
    setSelectedArtistId(credit.artistId);
    setSelectedRoleId(credit.roleId);
    setNotes(credit.notes ?? '');
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!selectedArtistId || !selectedRoleId) {
      setError('هنرمند و نقش را انتخاب کن.');
      return;
    }
    if (!targetId) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingCredit) {
        await updateCredit(editingCredit.id, {
          artistId: selectedArtistId,
          roleId: selectedRoleId,
          notes: notes.trim() || null,
        });
      } else if (targetType === 'track') {
        await addTrackCredit({
          artistId: selectedArtistId,
          roleId: selectedRoleId,
          trackId: targetId,
          notes: notes.trim() || null,
        });
      } else {
        await addAlbumCredit({
          artistId: selectedArtistId,
          roleId: selectedRoleId,
          albumId: targetId,
          notes: notes.trim() || null,
        });
      }
      await load();
      resetEditor();
      setSuccess(editingCredit ? 'تغییرات مشارکت ذخیره شد.' : 'مشارکت اضافه شد.');
    } catch (saveError: unknown) {
      const message = saveError instanceof Error ? saveError.message : 'ذخیرهٔ مشارکت انجام نشد.';
      setError(
        message.includes('قبلاً') || message.includes('UNIQUE')
          ? 'این هنرمند و نقش قبلاً برای همین مقصد ثبت شده است.'
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = (credit: CreditViewRecord) => {
    Alert.alert(
      'حذف مشارکت',
      `مشارکت «${credit.artistName} — ${credit.roleName}» حذف شود؟`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await removeCredit(credit.id);
                await load();
                setSuccess('مشارکت حذف شد.');
                if (editingCredit?.id === credit.id) resetEditor();
              } catch (removeError: unknown) {
                setError(
                  removeError instanceof Error ? removeError.message : 'حذف مشارکت انجام نشد.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  const targetLabel = targetType === 'track' ? 'قطعه' : 'آلبوم';
  const selectedArtist = artists.find((artist) => artist.id === selectedArtistId);
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.heading}>مشارکت‌کنندگان</Text>
          <Text style={styles.hint}>عوامل و نقش‌های صریح این {targetLabel}</Text>
        </View>
        {targetId ? (
          <Pressable
            testID={`${targetType}-credit-add`}
            accessibilityRole="button"
            accessibilityLabel="افزودن مشارکت"
            onPress={openNewEditor}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Feather name="plus" size={17} color={colors.primaryForeground} />
            <Text style={styles.addButtonText}>افزودن</Text>
          </Pressable>
        ) : null}
      </View>

      {!targetId ? (
        <View style={styles.emptyCard}>
          <Feather name="info" size={17} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>ابتدا {targetLabel} را ذخیره کن تا مشارکت اضافه شود.</Text>
        </View>
      ) : null}

      {targetId && credits.length > 0 ? (
        <View style={styles.list}>
          {credits.map((credit) => (
            <View key={credit.id} style={styles.creditRow}>
              <View style={styles.creditCopy}>
                <Text style={styles.creditArtist}>{credit.artistName}</Text>
                <Text style={styles.creditRole}>{credit.roleName}</Text>
                {credit.notes ? <Text style={styles.creditNotes}>{credit.notes}</Text> : null}
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  testID={`${targetType}-credit-edit-${credit.id}`}
                  accessibilityRole="button"
                  accessibilityLabel="ویرایش مشارکت"
                  onPress={() => openEditEditor(credit)}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Feather name="edit-2" size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                  testID={`${targetType}-credit-delete-${credit.id}`}
                  accessibilityRole="button"
                  accessibilityLabel="حذف مشارکت"
                  onPress={() => confirmRemove(credit)}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {targetId && !loading && credits.length === 0 && !editorOpen ? (
        <View style={styles.emptyCard}>
          <Feather name="users" size={17} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>هنوز مشارکتی برای این {targetLabel} ثبت نشده است.</Text>
        </View>
      ) : null}

      {editorOpen ? (
        <View style={styles.editor}>
          <View style={styles.editorHeader}>
            <Text style={styles.editorTitle}>
              {editingCredit ? 'ویرایش مشارکت' : 'افزودن مشارکت'}
            </Text>
            <Pressable
              testID={`${targetType}-credit-cancel`}
              accessibilityRole="button"
              accessibilityLabel="لغو ویرایش مشارکت"
              onPress={resetEditor}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>هنرمند</Text>
          <Pressable
            testID={`${targetType}-credit-artist-picker`}
            onPress={() => setArtistPickerOpen((open) => !open)}
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
          >
            <Feather
              name={artistPickerOpen ? 'chevron-up' : 'chevron-down'}
              size={17}
              color={colors.mutedForeground}
            />
            <Text style={[styles.pickerText, !selectedArtist && styles.placeholder]}>
              {selectedArtist?.name ?? 'انتخاب هنرمند'}
            </Text>
          </Pressable>
          {artistPickerOpen ? (
            <View style={styles.menu}>
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
                    <Text style={styles.menuText}>{artist.name}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>هنوز هنرمندی ثبت نشده است؛ ابتدا یک هنرمند اضافه کن.</Text>
              )}
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>نقش</Text>
          <Pressable
            testID={`${targetType}-credit-role-picker`}
            onPress={() => setRolePickerOpen((open) => !open)}
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
          >
            <Feather
              name={rolePickerOpen ? 'chevron-up' : 'chevron-down'}
              size={17}
              color={colors.mutedForeground}
            />
            <Text style={[styles.pickerText, !selectedRole && styles.placeholder]}>
              {selectedRole?.name ?? 'انتخاب نقش'}
            </Text>
          </Pressable>
          {rolePickerOpen ? (
            <View style={styles.menu}>
              {roles.length > 0 ? (
                roles.map((role) => (
                  <Pressable
                    key={role.id}
                    onPress={() => {
                      setSelectedRoleId(role.id);
                      setRolePickerOpen(false);
                    }}
                    style={styles.menuItem}
                  >
                    <Text style={styles.menuText}>{role.name}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>نقشی در آرشیو موجود نیست.</Text>
              )}
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>یادداشت اختیاری</Text>
          <TextInput
            testID={`${targetType}-credit-notes`}
            value={notes}
            onChangeText={setNotes}
            placeholder="توضیحی دربارهٔ این مشارکت…"
            placeholderTextColor={colors.mutedForeground}
            selectionColor={colors.primary}
            multiline
            style={styles.notesInput}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            testID={`${targetType}-credit-save`}
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void handleSave()}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          >
            <Feather name="check" size={17} color={colors.primaryForeground} />
            <Text style={styles.saveText}>{saving ? 'در حال ذخیره…' : 'ذخیرهٔ مشارکت'}</Text>
          </Pressable>
        </View>
      ) : null}

      {success ? <Text style={styles.success}>{success}</Text> : null}
      {error && !editorOpen ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { marginTop: 8, marginBottom: 10 },
    headingRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 10,
    },
    headingCopy: { flex: 1, alignItems: 'flex-end' },
    heading: { color: colors.foreground, fontSize: 17, fontWeight: '700', textAlign: 'right' },
    hint: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right', marginTop: 3 },
    addButton: {
      minHeight: 38,
      borderRadius: 12,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
    },
    addButtonText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700' },
    list: {
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
    },
    creditRow: {
      minHeight: 62,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    creditCopy: { flex: 1, alignItems: 'flex-end' },
    creditArtist: { color: colors.foreground, fontSize: 14, fontWeight: '600', textAlign: 'right' },
    creditRole: { color: colors.primary, fontSize: 12, marginTop: 3, textAlign: 'right' },
    creditNotes: { color: colors.mutedForeground, fontSize: 11, marginTop: 3, textAlign: 'right' },
    rowActions: { flexDirection: 'row', gap: 2 },
    iconButton: { padding: 8 },
    emptyCard: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    emptyText: { flex: 1, color: colors.mutedForeground, fontSize: 12, lineHeight: 19, textAlign: 'right' },
    editor: {
      marginTop: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
      padding: 12,
    },
    editorHeader: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    editorTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    fieldLabel: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'right',
      marginTop: 9,
      marginBottom: 6,
    },
    picker: {
      minHeight: 46,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.input,
      backgroundColor: colors.card,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    pickerText: { flex: 1, color: colors.foreground, fontSize: 13, textAlign: 'right' },
    placeholder: { color: colors.mutedForeground },
    menu: {
      marginTop: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    menuItem: {
      minHeight: 43,
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuText: { color: colors.foreground, fontSize: 13, textAlign: 'right' },
    notesInput: {
      minHeight: 70,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.input,
      backgroundColor: colors.card,
      color: colors.foreground,
      paddingHorizontal: 12,
      paddingTop: 11,
      fontSize: 13,
      textAlign: 'right',
      textAlignVertical: 'top',
    },
    saveButton: {
      minHeight: 45,
      borderRadius: 13,
      backgroundColor: colors.primary,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: 10,
    },
    saveText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    error: { color: colors.destructive, fontSize: 12, lineHeight: 18, marginTop: 7, textAlign: 'right' },
    success: { color: colors.primary, fontSize: 12, marginTop: 7, textAlign: 'right' },
    pressed: { opacity: 0.72 },
  });
}