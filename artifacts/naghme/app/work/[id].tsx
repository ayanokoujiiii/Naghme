import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { DetailCard, DetailRow, DetailShell, SectionHeading } from '@/components/DetailScreen';
import { useColors } from '@/hooks/useColors';
import { playTracksInQueue } from '@/src/audio/audioManager';
import {
  CreditViewRecord,
  deleteVersion,
  deleteWork,
  getWorkDetail,
  TrackRecord,
  VersionRecord,
  WorkDetailRecord,
} from '@/src/db/queries';

export default function WorkDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const workId = Array.isArray(id) ? id[0] : id;
  const [work, setWork] = useState<WorkDetailRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadWork = useCallback(async () => {
    if (!workId) {
      setError('شناسه‌ی اثر معتبر نیست.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getWorkDetail(workId);
      setWork(result);
      if (!result) setError('اثر پیدا نشد.');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن اثر انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useFocusEffect(useCallback(() => { void loadWork(); }, [loadWork]));

  const confirmDeleteWork = () => {
    if (!work) return;
    Alert.alert(
      'حذف اثر',
      `آیا از حذف «${work.title}» مطمئن هستید؟ فقط اثری که نسخه و قطعه‌ی متصل ندارد حذف می‌شود.`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void deleteWork(work.id)
              .then(() => router.back())
              .catch((deleteError: unknown) => {
                setError(deleteError instanceof Error ? deleteError.message : 'حذف اثر انجام نشد.');
              });
          },
        },
      ],
    );
  };

  const confirmDeleteVersion = (version: VersionRecord) => {
    Alert.alert(
      'حذف نسخه',
      `نسخه‌ی «${version.name}» حذف شود؟ قطعه‌ها باقی می‌مانند اما ارتباط نسخه‌شان برداشته می‌شود.`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void deleteVersion(version.id)
              .then(loadWork)
              .catch((deleteError: unknown) => {
                setError(deleteError instanceof Error ? deleteError.message : 'حذف نسخه انجام نشد.');
              });
          },
        },
      ],
    );
  };

  const playWork = () => {
    if (!work) return;
    const playable = work.tracks.filter((track) => track.audioUri);
    if (!playable.length) {
      Alert.alert('فایل صوتی پیدا نشد', 'قطعه‌های این اثر در آرشیو هستند، اما فعلاً فایل صوتی قابل پخش ندارند.');
      return;
    }
    void playTracksInQueue(work.tracks, 0);
  };

  if (loading) {
    return (
      <DetailShell eyebrow="در حال خواندن" title="اثر" icon="book-open">
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
      </DetailShell>
    );
  }

  if (!work) {
    return (
      <DetailShell eyebrow="آرشیو" title="اثر پیدا نشد" icon="alert-circle">
        <DetailCard><Text style={styles.errorText}>{error || 'این اثر دیگر در آرشیو نیست.'}</Text></DetailCard>
      </DetailShell>
    );
  }

  return (
    <DetailShell
      eyebrow="جزئیات اثر"
      title={work.title}
      icon="book-open"
      onEdit={() => router.push(`/add-work?id=${work.id}`)}
      onDelete={confirmDeleteWork}
    >
      {error ? <View style={styles.errorBox}><Feather name="alert-circle" size={17} color={colors.destructive} /><Text style={styles.errorText}>{error}</Text></View> : null}
      <Pressable
        testID="work-play-all"
        accessibilityRole="button"
        onPress={playWork}
        style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
      >
        <Feather name="play" size={17} color={colors.primaryForeground} />
        <Text style={styles.playButtonText}>پخش همهٔ اجراها</Text>
      </Pressable>
      <Pressable
        testID="work-open-graph"
        accessibilityRole="button"
        onPress={() => router.push(`/graph?focusType=work&focusId=${work.id}`)}
        style={({ pressed }) => [styles.graphButton, pressed && styles.pressed]}
      >
        <Feather name="git-branch" size={16} color={colors.primary} />
        <Text style={styles.graphButtonText}>باز کردن در نقشه‌ی موسیقی</Text>
      </Pressable>
      <SectionHeading title="اطلاعات اثر" caption="جزئیات ثبت‌شده" />
      <DetailCard>
        <DetailRow label="عنوان‌های جایگزین" value={work.alternateTitles ?? 'ثبت نشده'} />
        <DetailRow label="زبان" value={work.language ?? 'ثبت نشده'} />
        <DetailRow label="ژانر" value={work.genre ?? 'ثبت نشده'} />
        <Text style={styles.description}>{work.description ?? 'هنوز توضیحی برای این اثر ثبت نشده است.'}</Text>
      </DetailCard>

      <View style={styles.headingWithAction}>
        <SectionHeading title="نسخه‌ها" caption={`${work.versions.length} نسخه`} />
        <Pressable
          testID="work-add-version"
          onPress={() => router.push(`/add-version?workId=${work.id}`)}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Feather name="plus" size={16} color={colors.primaryForeground} />
          <Text style={styles.addButtonText}>افزودن نسخه</Text>
        </Pressable>
      </View>
      <DetailCard>
        {work.versions.length ? work.versions.map((version) => (
          <View key={version.id} style={styles.versionRow}>
            <View style={styles.rowActions}>
              <Pressable
                testID={`version-edit-${version.id}`}
                onPress={() => router.push(`/add-version?id=${version.id}`)}
                style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
              >
                <Feather name="edit-2" size={15} color={colors.primary} />
              </Pressable>
              <Pressable
                testID={`version-delete-${version.id}`}
                onPress={() => confirmDeleteVersion(version)}
                style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}
              >
                <Feather name="trash-2" size={15} color={colors.destructive} />
              </Pressable>
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.versionName}>{version.name}</Text>
              <Text style={styles.versionMeta}>{version.kind ?? 'نوع نسخه ثبت نشده'}  •  {version.trackCount} قطعه</Text>
              {version.description ? <Text style={styles.versionDescription}>{version.description}</Text> : null}
            </View>
          </View>
        )) : <Text style={styles.mutedText}>هنوز نسخه‌ای برای این اثر ثبت نشده است.</Text>}
      </DetailCard>

      <SectionHeading title="مشارکت‌کنندگان اثر" caption={`${work.credits.length} مشارکت`} />
      <DetailCard>
        {work.credits.length ? work.credits.map((credit) => (
          <CreditRow key={credit.id} credit={credit} styles={styles} />
        )) : <Text style={styles.mutedText}>برای این اثر هنوز مشارکتی ثبت نشده است.</Text>}
      </DetailCard>

      <SectionHeading title="قطعه‌های متصل" caption={`${work.tracks.length} قطعه`} />
      <DetailCard>
        {work.tracks.length ? work.tracks.map((track) => <TrackRow key={track.id} track={track} styles={styles} onPress={() => router.push(`/track/${track.id}`)} />) : <Text style={styles.mutedText}>هنوز قطعه‌ای به این اثر متصل نشده است.</Text>}
      </DetailCard>
    </DetailShell>
  );
}

function CreditRow({
  credit,
  styles,
}: {
  credit: CreditViewRecord;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.creditRow}>
      <View style={styles.creditCopy}>
        <Text style={styles.creditArtist}>{credit.artistName}</Text>
        <Text style={styles.creditRole}>{credit.roleName}</Text>
      </View>
      <Feather name="user" size={17} color={styles.creditIcon.color as string} />
    </View>
  );
}

function TrackRow({ track, styles, onPress }: { track: TrackRecord; styles: ReturnType<typeof createStyles>; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.trackRow, pressed && styles.pressed]}>
      <Text style={styles.trackTitle}>{track.title}</Text>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
    errorBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: 'rgba(217, 107, 95, 0.14)', borderRadius: 14, padding: 12, marginBottom: 18 },
    errorText: { flex: 1, color: colors.destructive, fontSize: 13, lineHeight: 21, textAlign: 'right' },
    graphButton: { minHeight: 43, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, marginBottom: 18 },
    graphButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    playButton: { minHeight: 46, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: colors.primary, marginBottom: 16 },
    playButtonText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '700' },
    description: { color: colors.foreground, fontSize: 14, lineHeight: 23, textAlign: 'right', marginTop: 13 },
    headingWithAction: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
    addButton: { minHeight: 36, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 10, marginBottom: 12 },
    addButtonText: { color: colors.primaryForeground, fontSize: 11, fontWeight: '700' },
    versionRow: { minHeight: 64, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowActions: { flexDirection: 'row', gap: 2 },
    smallAction: { width: 28, height: 30, alignItems: 'center', justifyContent: 'center' },
    rowCopy: { flex: 1, alignItems: 'flex-end' },
    versionName: { color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    versionMeta: { color: colors.primary, fontSize: 11, marginTop: 3, textAlign: 'right' },
    versionDescription: { color: colors.mutedForeground, fontSize: 11, marginTop: 3, textAlign: 'right' },
    trackRow: { minHeight: 46, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    trackTitle: { flex: 1, color: colors.foreground, fontSize: 14, textAlign: 'right' },
    mutedText: { color: colors.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'right' },
    creditRow: { minHeight: 55, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    creditCopy: { flex: 1, alignItems: 'flex-end' },
    creditArtist: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    creditRole: { color: colors.primary, fontSize: 11, marginTop: 3, textAlign: 'right' },
    creditIcon: { color: colors.primary },
    iconColor: { color: colors.mutedForeground },
    pressed: { opacity: 0.72 },
  });
}