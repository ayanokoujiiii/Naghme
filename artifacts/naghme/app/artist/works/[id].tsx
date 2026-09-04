import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { DetailCard, DetailShell, SectionHeading } from '@/components/DetailScreen';
import { useColors } from '@/hooks/useColors';
import { playTracksInQueue } from '@/src/audio/audioManager';
import {
  ArtistRecord,
  CreditViewRecord,
  getArtistById,
  getCreditsForArtist,
  getTracks,
  TrackRecord,
} from '@/src/db/queries';

type RoleGroup = {
  roleName: string;
  credits: CreditViewRecord[];
  tracks: TrackRecord[];
};

export default function ArtistWorksScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const artistId = Array.isArray(id) ? id[0] : id;
  const [artist, setArtist] = useState<ArtistRecord | null>(null);
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!artistId) return;
    setLoading(true);
    setError('');
    try {
      const [nextArtist, credits, allTracks] = await Promise.all([
        getArtistById(artistId),
        getCreditsForArtist(artistId),
        getTracks(),
      ]);
      setArtist(nextArtist);
      const byRole = new Map<string, RoleGroup>();
      for (const credit of credits) {
        const group = byRole.get(credit.roleId) ?? { roleName: credit.roleName, credits: [], tracks: [] };
        group.credits.push(credit);
        byRole.set(credit.roleId, group);
      }
      for (const group of byRole.values()) {
        const targetIds = new Set(group.credits.map((credit) => credit.trackId).filter(Boolean));
        const albumIds = new Set(group.credits.map((credit) => credit.albumId).filter(Boolean));
        const workIds = new Set(group.credits.map((credit) => credit.workId).filter(Boolean));
        group.tracks = allTracks.filter((track) => (
          targetIds.has(track.id)
          || (track.albumId !== null && albumIds.has(track.albumId))
          || (track.workId !== null && workIds.has(track.workId))
        ));
      }
      setGroups(Array.from(byRole.values()).sort((a, b) => a.roleName.localeCompare(b.roleName, 'fa')));
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن کارهای هنرمند انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const playGroup = (group: RoleGroup) => {
    if (!group.tracks.length) {
      Alert.alert('قطعه‌ای برای پخش نیست', 'این نقش به اثر یا آلبوم متصل است، اما هنوز قطعهٔ قابل پخشی برای آن پیدا نشد.');
      return;
    }
    void playTracksInQueue(group.tracks, 0);
  };

  return (
    <DetailShell
      eyebrow="کاوش مشارکت‌ها"
      title={artist?.name ?? 'کارهای هنرمند'}
      subtitle="مشارکت‌ها بر اساس نقش گروه‌بندی شده‌اند."
      icon="layers"
    >
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.mutedText}>در حال آماده‌سازی...</Text></View>
      ) : error ? (
        <View style={styles.errorBox}><Feather name="alert-circle" size={17} color={colors.destructive} /><Text style={styles.errorText}>{error}</Text></View>
      ) : groups.length ? (
        groups.map((group) => (
          <View key={group.roleName} style={styles.group}>
            <View style={styles.groupHeading}>
              <View style={styles.groupHeadingCopy}>
                <SectionHeading title={group.roleName} caption={`${group.credits.length} مشارکت`} />
              </View>
              <Pressable
                testID={`artist-role-play-${group.roleName}`}
                accessibilityRole="button"
                onPress={() => playGroup(group)}
                style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
              >
                <Feather name="play" size={14} color={colors.primaryForeground} />
                <Text style={styles.playButtonText}>پخش نقش</Text>
              </Pressable>
            </View>
            <DetailCard>
              {group.credits.map((credit) => (
                <Pressable
                  key={credit.id}
                  onPress={() => {
                    if (credit.trackId) router.push(`/track/${credit.trackId}`);
                    else if (credit.albumId) router.push(`/album/${credit.albumId}`);
                    else if (credit.workId) router.push(`/work/${credit.workId}`);
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle} numberOfLines={2}>{credit.workTitle ?? credit.trackTitle ?? credit.albumTitle ?? 'مقصد نامشخص'}</Text>
                    <Text style={styles.rowMeta}>{credit.workId ? 'اثر' : credit.trackId ? 'قطعه' : 'آلبوم'}</Text>
                  </View>
                </Pressable>
              ))}
            </DetailCard>
          </View>
        ))
      ) : (
        <DetailCard>
          <View style={styles.emptyIcon}><Feather name="layers" size={23} color={colors.primary} /></View>
          <Text style={styles.emptyTitle}>هنوز مشارکتی ثبت نشده است</Text>
          <Text style={styles.mutedText}>از صفحهٔ افزودن قطعه، آلبوم یا اثر می‌توانی نقش این هنرمند را ثبت کنی.</Text>
          <Pressable onPress={() => router.push('/add-track')} style={({ pressed }) => [styles.registerButton, pressed && styles.pressed]}>
            <Feather name="plus" size={16} color={colors.primary} />
            <Text style={styles.registerButtonText}>ثبت یک مشارکت</Text>
          </Pressable>
        </DetailCard>
      )}
    </DetailShell>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { alignItems: 'center', gap: 10, paddingVertical: 50 },
    mutedText: { color: colors.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'right' },
    errorBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, backgroundColor: colors.destructive + '18' },
    errorText: { flex: 1, color: colors.destructive, fontSize: 12, textAlign: 'right' },
    group: { marginBottom: 10 },
    groupHeading: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
    groupHeadingCopy: { flex: 1 },
    playButton: { minHeight: 36, flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, backgroundColor: colors.primary, marginBottom: 12 },
    playButtonText: { color: colors.primaryForeground, fontSize: 10, fontWeight: '700' },
    row: { minHeight: 57, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowCopy: { flex: 1, alignItems: 'flex-end' },
    rowTitle: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    rowMeta: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
    emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, alignSelf: 'flex-end', marginBottom: 12 },
    emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: '700', textAlign: 'right', marginBottom: 7 },
    registerButton: { minHeight: 42, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13, backgroundColor: colors.secondary, marginTop: 15 },
    registerButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    pressed: { opacity: 0.72 },
  });
}