import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { DetailCard, DetailRow, DetailShell, SectionHeading } from '@/components/DetailScreen';
import { useColors } from '@/hooks/useColors';
import {
  ArtistRecord,
  deleteArtist,
  getArtistById,
  getTracksByArtistId,
  TrackRecord,
} from '@/src/db/queries';

export default function ArtistDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const artistId = Array.isArray(id) ? id[0] : id;
  const [artist, setArtist] = useState<ArtistRecord | null>(null);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadArtist = useCallback(async () => {
    if (!artistId) {
      setError('شناسه‌ی هنرمند معتبر نیست.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [foundArtist, artistTracks] = await Promise.all([
        getArtistById(artistId),
        getTracksByArtistId(artistId),
      ]);
      if (!foundArtist) setError('هنرمند پیدا نشد.');
      else {
        setArtist(foundArtist);
        setTracks(artistTracks);
      }
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن هنرمند انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useFocusEffect(
    useCallback(() => {
      void loadArtist();
    }, [loadArtist]),
  );

  const confirmDelete = () => {
    if (!artist) return;
    Alert.alert(
      'حذف هنرمند',
      `آیا از حذف «${artist.name}» مطمئن هستید؟`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteArtist(artist.id);
                router.back();
              } catch (deleteError: unknown) {
                setError(
                  deleteError instanceof Error ? deleteError.message : 'حذف هنرمند انجام نشد.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <DetailShell eyebrow="در حال خواندن" title="هنرمند" icon="mic">
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </DetailShell>
    );
  }

  if (!artist) {
    return (
      <DetailShell eyebrow="آرشیو" title="هنرمند پیدا نشد" icon="alert-circle">
        <DetailCard>
          <Text style={styles.errorText}>{error || 'این هنرمند دیگر در آرشیو نیست.'}</Text>
        </DetailCard>
      </DetailShell>
    );
  }

  return (
    <DetailShell
      eyebrow="جزئیات هنرمند"
      title={artist.name}
      icon="mic"
      onEdit={() => router.push(`/add-artist?id=${artist.id}`)}
      onDelete={confirmDelete}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <SectionHeading title="اطلاعات هنرمند" caption="جزئیات ثبت‌شده" />
      <DetailCard>
        <DetailRow label="نام" value={artist.name} />
        <DetailRow label="نوع" value={artist.type ?? 'ثبت نشده'} />
        <DetailRow label="سبک‌ها" value={artist.genres ?? 'ثبت نشده'} />
      </DetailCard>

      <SectionHeading title="یادداشت" />
      <DetailCard>
        <Text style={styles.biography}>
          {artist.biography ?? 'هنوز یادداشتی برای این هنرمند ثبت نشده است.'}
        </Text>
      </DetailCard>

      <SectionHeading title="قطعه‌های هنرمند" caption={`${tracks.length} قطعه`} />
      <DetailCard>
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <Pressable
              key={track.id}
              testID={`artist-track-${track.id}`}
              onPress={() => router.push(`/track/${track.id}`)}
              style={({ pressed }) => [styles.trackRow, pressed && styles.pressed]}
            >
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.mutedText}>هنوز قطعه‌ای به این هنرمند وصل نشده است.</Text>
        )}
      </DetailCard>
    </DetailShell>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
    errorBox: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(217, 107, 95, 0.14)',
      borderRadius: 14,
      padding: 12,
      marginBottom: 18,
    },
    errorText: {
      flex: 1,
      color: colors.destructive,
      fontSize: 13,
      lineHeight: 21,
      textAlign: 'right',
    },
    biography: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 24,
      textAlign: 'right',
    },
    trackRow: {
      minHeight: 46,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    trackTitle: {
      flex: 1,
      flexShrink: 1,
      color: colors.foreground,
      fontSize: 14,
      textAlign: 'right',
    },
    mutedText: {
      color: colors.mutedForeground,
      fontSize: 13,
      lineHeight: 21,
      textAlign: 'right',
    },
    pressed: { opacity: 0.72 },
  });
}