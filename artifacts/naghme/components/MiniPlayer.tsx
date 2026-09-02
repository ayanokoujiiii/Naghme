import { Feather } from '@expo/vector-icons';
import { router, useSegments } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  AudioPlaybackSnapshot,
  getAudioSnapshot,
  subscribeToAudio,
  toggleAudioPlayback,
} from '@/src/audio/audioManager';

export function MiniPlayer() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [audio, setAudio] = useState<AudioPlaybackSnapshot>(() => getAudioSnapshot());

  useEffect(() => subscribeToAudio(setAudio), []);

  const visible = Boolean(audio.trackId && audio.uri && (audio.isLoaded || audio.isLoading || audio.error));
  if (!visible || !audio.track) return null;

  const isTabsRoute = segments[0] === '(tabs)';
  const isPlayerRoute = segments[0] === 'player';
  if (isPlayerRoute) return null;
  const bottom = insets.bottom + (isTabsRoute ? (Platform.OS === 'web' ? 86 : 78) : 12);
  const toggle = async () => {
    if (!audio.isLoaded || audio.isBuffering) return;
    await toggleAudioPlayback().catch(() => undefined);
  };

  return (
    <View style={[styles.positioner, { bottom, pointerEvents: 'box-none' }]}>
      <Pressable
        testID="mini-player"
        accessibilityRole="button"
        accessibilityLabel="بازکردن پخش‌کننده"
        onPress={() => router.push('/player')}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {audio.track.coverImage ? (
          <Image source={{ uri: audio.track.coverImage }} style={styles.cover} />
        ) : (
          <View style={styles.coverFallback}>
            <Feather name="music" size={18} color={colors.primary} />
          </View>
        )}
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{audio.track.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {audio.error || audio.track.versionName || audio.track.artistName || 'در حال پخش'}
          </Text>
        </View>
        <Pressable
          testID="mini-player-toggle"
          accessibilityRole="button"
          accessibilityLabel={audio.isPlaying ? 'توقف پخش' : 'پخش'}
          disabled={!audio.isLoaded || audio.isBuffering}
          onPress={() => void toggle()}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          {audio.isLoading || audio.isBuffering ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Feather
              name={audio.isPlaying ? 'pause' : 'play'}
              size={17}
              color={colors.primaryForeground}
            />
          )}
        </Pressable>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    positioner: {
      position: 'absolute',
      left: 14,
      right: 14,
      zIndex: 50,
      elevation: 10,
    },
    card: {
      minHeight: 64,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 9,
      paddingVertical: 8,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      shadowColor: colors.background,
      shadowOpacity: 0.32,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    cover: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.secondary },
    coverFallback: {
      width: 46,
      height: 46,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    copy: { flex: 1, alignItems: 'flex-end' },
    title: { color: colors.foreground, fontSize: 13, fontWeight: '700', textAlign: 'right' },
    subtitle: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right', marginTop: 4 },
    toggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    pressed: { opacity: 0.72 },
  });
}