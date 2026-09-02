import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  AudioPlaybackSnapshot,
  getAudioSnapshot,
  subscribeToAudio,
  toggleAudioPlayback,
} from '@/src/audio/audioManager';

export default function PlayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [audio, setAudio] = useState<AudioPlaybackSnapshot>(() => getAudioSnapshot());
  const [error, setError] = useState<string>('');

  useEffect(() => subscribeToAudio(setAudio), []);

  const togglePlayback = async () => {
    if (!audio.isLoaded || audio.isBuffering) return;
    setError('');
    try {
      await toggleAudioPlayback();
    } catch {
      setError('پخش این قطعه انجام نشد.');
    }
  };

  if (!audio.track) {
    return (
      <View style={[styles.screen, styles.emptyScreen, { paddingTop: insets.top + 16 }]}>
        <Pressable
          testID="player-close"
          accessibilityRole="button"
          accessibilityLabel="بستن پخش‌کننده"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Feather name="chevron-down" size={25} color={colors.foreground} />
        </Pressable>
        <Feather name="music" size={42} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>هنوز قطعه‌ای در حال پخش نیست</Text>
        <Text style={styles.emptyCopy}>از یک قطعه، پخش‌کننده را باز کن تا اینجا جزئیات آن را ببینی.</Text>
      </View>
    );
  }

  const durationMillis = audio.durationMillis || (audio.track.durationSeconds ?? 0) * 1000;
  const progress = durationMillis > 0
    ? Math.min(1, Math.max(0, audio.positionMillis / durationMillis))
    : 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24),
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            testID="player-close"
            accessibilityRole="button"
            accessibilityLabel="بستن پخش‌کننده"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Feather name="chevron-down" size={25} color={colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>اکنون در حال پخش</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.posterFrame}>
          {audio.track.coverImage ? (
            <Image
              source={{ uri: audio.track.coverImage }}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.posterFallback}>
              <Feather name="music" size={54} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.metadata}>
          <Text style={styles.title} numberOfLines={2}>{audio.track.title}</Text>
          {audio.track.versionName ? (
            <Text style={styles.version}>{audio.track.versionName}</Text>
          ) : null}
          <Text style={styles.artist}>{audio.track.artistName || 'هنرمند ناشناس'}</Text>
        </View>

        <View style={styles.playback}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressValue, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(audio.positionMillis)}</Text>
            <Text style={styles.time}>{formatTime(durationMillis)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.controlSpacer} />
          <Pressable
            testID="player-toggle"
            accessibilityRole="button"
            accessibilityLabel={audio.isPlaying ? 'توقف پخش' : 'پخش قطعه'}
            disabled={!audio.isLoaded || audio.isBuffering}
            onPress={() => void togglePlayback()}
            style={({ pressed }) => [
              styles.playButton,
              (!audio.isLoaded || audio.isBuffering) && styles.playButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {audio.isLoading || audio.isBuffering ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Feather
                name={audio.isPlaying ? 'pause' : 'play'}
                size={30}
                color={colors.primaryForeground}
              />
            )}
          </Pressable>
          <View style={styles.controlSpacer} />
        </View>

        {error || audio.error ? <Text style={styles.errorText}>{error || audio.error}</Text> : null}

        <View style={styles.lyricsSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>متن ترانه</Text>
            <Feather name="book-open" size={19} color={colors.primary} />
          </View>
          {audio.track.lyrics ? (
            <Text style={styles.lyrics}>{audio.track.lyrics}</Text>
          ) : (
            <Text style={styles.noLyrics}>برای این قطعه هنوز متنی ثبت نشده است.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    emptyScreen: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
    content: { paddingHorizontal: 22 },
    header: {
      minHeight: 46,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
    headerSpacer: { width: 44 },
    posterFrame: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    poster: { width: '100%', height: '100%' },
    posterFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
    metadata: { alignItems: 'center', marginTop: 24 },
    title: { color: colors.foreground, fontSize: 25, lineHeight: 33, fontWeight: '700', textAlign: 'center' },
    version: { color: colors.primary, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
    artist: { color: colors.mutedForeground, fontSize: 14, textAlign: 'center', marginTop: 6 },
    playback: { marginTop: 28 },
    progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.secondary },
    progressValue: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    time: { color: colors.mutedForeground, fontSize: 11 },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    controlSpacer: { flex: 1 },
    playButton: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    playButtonDisabled: { opacity: 0.62 },
    lyricsSection: {
      marginTop: 30,
      padding: 18,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeading: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    sectionTitle: { color: colors.foreground, fontSize: 18, fontWeight: '700', textAlign: 'right' },
    lyrics: { color: colors.cardForeground, fontSize: 16, lineHeight: 32, textAlign: 'right' },
    noLyrics: { color: colors.mutedForeground, fontSize: 14, lineHeight: 24, textAlign: 'right' },
    errorText: { color: colors.destructive, fontSize: 12, textAlign: 'center', marginTop: 14 },
    emptyTitle: { color: colors.foreground, fontSize: 19, fontWeight: '700', textAlign: 'center', marginTop: 18 },
    emptyCopy: { color: colors.mutedForeground, fontSize: 14, lineHeight: 24, textAlign: 'center', marginTop: 8 },
    pressed: { opacity: 0.72 },
  });
}