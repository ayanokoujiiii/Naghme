import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { DetailCard, DetailRow, DetailShell, SectionHeading } from '@/components/DetailScreen';
import { useColors } from '@/hooks/useColors';
import {
  AlbumRecord,
  deleteAlbum,
  getAlbumById,
  getTracksByAlbumId,
  TrackRecord,
} from '@/src/db/queries';

export default function AlbumDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const albumId = Array.isArray(id) ? id[0] : id;
  const [album, setAlbum] = useState<AlbumRecord | null>(null);
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadAlbum = useCallback(async () => {
    if (!albumId) {
      setError('شناسه‌ی آلبوم معتبر نیست.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [foundAlbum, albumTracks] = await Promise.all([
        getAlbumById(albumId),
        getTracksByAlbumId(albumId),
      ]);
      if (!foundAlbum) {
        setError('آلبوم پیدا نشد.');
      } else {
        setAlbum(foundAlbum);
        setTracks(albumTracks);
      }
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'خواندن آلبوم انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useFocusEffect(
    useCallback(() => {
      void loadAlbum();
    }, [loadAlbum]),
  );

  const confirmDelete = () => {
    if (!album) return;
    Alert.alert(
      'حذف آلبوم',
      `آیا از حذف «${album.title}» مطمئن هستید؟ قطعه‌های آن حفظ می‌شوند اما بدون آلبوم خواهند شد.`,
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteAlbum(album.id);
                router.back();
              } catch (deleteError: unknown) {
                setError(
                  deleteError instanceof Error ? deleteError.message : 'حذف آلبوم انجام نشد.',
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
      <DetailShell eyebrow="در حال خواندن" title="آلبوم" icon="disc">
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </DetailShell>
    );
  }

  if (!album) {
    return (
      <DetailShell eyebrow="آرشیو" title="آلبوم پیدا نشد" icon="alert-circle">
        <DetailCard>
          <Text style={styles.errorText}>{error || 'این آلبوم دیگر در آرشیو نیست.'}</Text>
        </DetailCard>
      </DetailShell>
    );
  }

  return (
    <DetailShell
      eyebrow="جزئیات آلبوم"
      title={album.title}
      icon="disc"
      onEdit={() => router.push(`/add-album?id=${album.id}`)}
      onDelete={confirmDelete}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <SectionHeading title="اطلاعات آلبوم" caption="جزئیات ثبت‌شده" />
      <DetailCard>
        <DetailRow label="عنوان" value={album.title} />
        <DetailRow
          label="سال انتشار"
          value={album.releaseYear === null ? 'ثبت نشده' : album.releaseYear.toString()}
        />
      </DetailCard>

      <SectionHeading title="قطعه‌های آلبوم" caption={`${tracks.length} قطعه`} />
      <DetailCard>
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <Pressable
              key={track.id}
              testID={`album-track-${track.id}`}
              onPress={() => router.push(`/track/${track.id}`)}
              style={({ pressed }) => [styles.trackRow, pressed && styles.pressed]}
            >
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              <Text style={styles.trackTitle} numberOfLines={2}>{track.title}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.mutedText}>هنوز قطعه‌ای به این آلبوم وصل نشده است.</Text>
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