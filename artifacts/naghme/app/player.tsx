import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
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
  cycleRepeatMode,
  setSleepTimer,
  rewindAudio,
  subscribeToAudio,
  toggleAudioPlayback,
  RepeatMode,
} from '@/src/audio/audioManager';
import { getLatestJournalMood } from '@/src/db/queries';
import { getDominantCoverColor, withAlpha } from '@/src/player/coverColors';

type SleepTimerMinutes = 15 | 30 | 45 | 60;

const sleepTimerOptions: Array<{ value: SleepTimerMinutes; label: string }> = [
  { value: 15, label: '۱۵ دقیقه' },
  { value: 30, label: '۳۰ دقیقه' },
  { value: 45, label: '۴۵ دقیقه' },
  { value: 60, label: '۶۰ دقیقه' },
];

export default function PlayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [audio, setAudio] = useState<AudioPlaybackSnapshot>(() => getAudioSnapshot());
  const [error, setError] = useState<string>('');
  const [sleepTimerVisible, setSleepTimerVisible] = useState<boolean>(false);
  const [coverColor, setCoverColor] = useState<string>(colors.primary);
  const [latestMood, setLatestMood] = useState<string | null>(null);

  useEffect(() => subscribeToAudio(setAudio), []);

  useEffect(() => {
    let mounted = true;
    setLatestMood(null);
    if (!audio.trackId) return () => {
      mounted = false;
    };
    void getLatestJournalMood(audio.trackId)
      .then((mood) => {
        if (mounted) setLatestMood(mood);
      })
      .catch(() => {
        if (mounted) setLatestMood(null);
      });
    return () => {
      mounted = false;
    };
  }, [audio.trackId]);

  useEffect(() => {
    let mounted = true;
    setCoverColor(colors.primary);
    if (!audio.track?.coverImage) return () => {
      mounted = false;
    };
    void getDominantCoverColor(audio.track.coverImage, colors.primary).then((color) => {
      if (mounted) setCoverColor(color);
    });
    return () => {
      mounted = false;
    };
  }, [audio.track?.coverImage, colors.primary]);

  const togglePlayback = async () => {
    if (!audio.isLoaded || audio.isBuffering) return;
    setError('');
    try {
      await toggleAudioPlayback();
    } catch {
      setError('پخش این قطعه انجام نشد.');
    }
  };

  const rewind = async () => {
    if (!audio.isLoaded || audio.isBuffering) return;
    setError('');
    try {
      await rewindAudio();
    } catch {
      setError('بازگشت ده‌ثانیه‌ای انجام نشد.');
    }
  };

  const repeat = async () => {
    setError('');
    try {
      await cycleRepeatMode();
    } catch {
      setError('تغییر حالت تکرار انجام نشد.');
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
          <Pressable
            testID="player-sleep-timer"
            accessibilityRole="button"
            accessibilityLabel={
              audio.sleepTimerRemainingSeconds > 0
                ? `تایمر خواب، ${formatSleepTimer(audio.sleepTimerRemainingSeconds)} باقی مانده`
                : 'تایمر خواب'
            }
            accessibilityState={{ selected: audio.sleepTimerRemainingSeconds > 0 }}
            onPress={() => setSleepTimerVisible(true)}
            style={({ pressed }) => [
              styles.timerButton,
              audio.sleepTimerRemainingSeconds > 0 && styles.timerButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Feather
              name="clock"
              size={19}
              color={audio.sleepTimerRemainingSeconds > 0 ? colors.primary : colors.foreground}
            />
            {audio.sleepTimerRemainingSeconds > 0 ? (
              <Text style={styles.timerCountdown}>
                {formatSleepTimer(audio.sleepTimerRemainingSeconds)}
              </Text>
            ) : null}
          </Pressable>
        </View>

        <View
          style={[
            styles.posterFrame,
            {
              shadowColor: coverColor,
              shadowOpacity: coverColor === colors.primary ? 0.24 : 0.62,
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[withAlpha(coverColor, 0.7), withAlpha(coverColor, 0.18), colors.card]}
            style={styles.posterGlow}
          />
          <View style={styles.posterInner}>
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
            <MoodOverlay mood={latestMood} colors={colors} styles={styles} />
          </View>
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
          <Pressable
            testID="player-rewind"
            accessibilityRole="button"
            accessibilityLabel="بازگشت ده ثانیه"
            disabled={!audio.isLoaded || audio.isBuffering}
            onPress={() => void rewind()}
            style={({ pressed }) => [
              styles.secondaryControl,
              (!audio.isLoaded || audio.isBuffering) && styles.secondaryControlDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="rotate-ccw" size={21} color={colors.foreground} />
            <Text style={styles.secondaryControlText}>۱۰ ثانیه</Text>
          </Pressable>
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
          <Pressable
            testID="player-repeat"
            accessibilityRole="button"
            accessibilityLabel={repeatModeLabel(audio.repeatMode)}
            accessibilityState={{ selected: audio.repeatMode !== 'off' }}
            onPress={() => void repeat()}
            style={({ pressed }) => [
              styles.secondaryControl,
              audio.repeatMode !== 'off' && styles.secondaryControlActive,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="repeat" size={21} color={audio.repeatMode !== 'off' ? colors.primary : colors.foreground} />
            <Text style={[styles.secondaryControlText, audio.repeatMode !== 'off' && styles.secondaryControlTextActive]}>
              {repeatModeShortLabel(audio.repeatMode)}
            </Text>
          </Pressable>
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

      <Modal
        visible={sleepTimerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSleepTimerVisible(false)}
      >
        <Pressable
          testID="player-sleep-timer-backdrop"
          style={styles.timerModalBackdrop}
          onPress={() => setSleepTimerVisible(false)}
        >
          <View
            style={styles.timerSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.timerSheetHandle} />
            <View style={styles.timerSheetHeading}>
              <Feather name="moon" size={20} color={colors.primary} />
              <Text style={styles.timerSheetTitle}>تایمر خواب</Text>
            </View>
            <Text style={styles.timerSheetCopy}>
              پخش پس از زمان انتخاب‌شده متوقف می‌شود.
            </Text>
            <View style={styles.timerOptions}>
              {sleepTimerOptions.map((option) => (
                <Pressable
                  key={option.value}
                  testID={`player-sleep-${option.value}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setSleepTimer(option.value);
                    setSleepTimerVisible(false);
                  }}
                  style={({ pressed }) => [styles.timerOption, pressed && styles.pressed]}
                >
                  <Feather name="clock" size={17} color={colors.primary} />
                  <Text style={styles.timerOptionText}>{option.label}</Text>
                </Pressable>
              ))}
              <Pressable
                testID="player-sleep-cancel"
                accessibilityRole="button"
                onPress={() => {
                  setSleepTimer(null);
                  setSleepTimerVisible(false);
                }}
                style={({ pressed }) => [
                  styles.timerOption,
                  styles.timerCancelOption,
                  pressed && styles.pressed,
                ]}
              >
                <Feather name="x" size={18} color={colors.mutedForeground} />
                <Text style={styles.timerCancelText}>لغو تایمر</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function repeatModeLabel(mode: RepeatMode): string {
  if (mode === 'track') return 'تکرار قطعه';
  if (mode === 'context') return 'تکرار آلبوم';
  return 'بدون تکرار';
}

function repeatModeShortLabel(mode: RepeatMode): string {
  if (mode === 'track') return 'قطعه';
  if (mode === 'context') return 'آلبوم';
  return 'تکرار';
}

function formatSleepTimer(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainingSeconds = Math.max(0, seconds) % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function MoodOverlay({
  mood,
  colors,
  styles,
}: {
  mood: string | null;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const normalizedMood = mood?.trim() ?? '';
  const kind = normalizedMood.includes('غمگین')
    ? 'rain'
    : normalizedMood.includes('پرانرژی')
      ? 'energy'
      : normalizedMood.includes('آرام')
        ? 'calm'
        : null;

  useEffect(() => {
    if (!kind) return;
    progress.setValue(0);
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: kind === 'rain' ? 2600 : kind === 'energy' ? 900 : 3200,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [kind, progress]);

  if (!kind) return null;
  if (kind === 'rain') {
    return (
      <View pointerEvents="none" style={styles.moodOverlay}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.rainDrop,
              {
                left: `${10 + index * 11}%`,
                opacity: progress.interpolate({
                  inputRange: [0, 0.15, 0.8, 1],
                  outputRange: [0, 0.52, 0.28, 0],
                }),
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-18 - (index % 3) * 14, 145],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    );
  }

  if (kind === 'calm') {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.moodOverlay,
          styles.calmGlow,
          {
            backgroundColor: withAlpha(colors.primary, 0.22),
            opacity: progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.12, 0.4, 0.12],
            }),
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.9, 1.08, 0.9],
                }),
              },
            ],
          },
        ]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.moodOverlay,
        styles.energyGlow,
        {
          backgroundColor: withAlpha(colors.primary, 0.18),
          opacity: progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.08, 0.28, 0.08],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.96, 1.04, 0.96],
              }),
            },
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['-2deg', '2deg'],
              }),
            },
          ],
        },
      ]}
    />
  );
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
    timerButton: {
      minWidth: 44,
      minHeight: 44,
      borderRadius: 15,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 6,
    },
    timerButtonActive: { borderColor: colors.primary, backgroundColor: colors.accent },
    timerCountdown: { color: colors.primary, fontSize: 10, fontWeight: '700' },
    posterFrame: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 28,
      overflow: 'visible',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 9,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    posterGlow: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 28,
    },
    posterInner: {
      flex: 1,
      overflow: 'hidden',
      borderRadius: 21,
      backgroundColor: colors.card,
    },
    poster: { width: '100%', height: '100%' },
    posterFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    moodOverlay: { ...StyleSheet.absoluteFillObject },
    rainDrop: {
      position: 'absolute',
      top: 0,
      width: 2,
      height: 40,
      borderRadius: 2,
      backgroundColor: colors.primaryForeground,
    },
    calmGlow: { borderRadius: 999 },
    energyGlow: { borderRadius: 999 },
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
    secondaryControl: {
      minWidth: 68,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 12,
      paddingHorizontal: 8,
    },
    secondaryControlDisabled: { opacity: 0.5 },
    secondaryControlActive: { borderColor: colors.primary, backgroundColor: colors.accent },
    secondaryControlText: { color: colors.mutedForeground, fontSize: 10, fontWeight: '600' },
    secondaryControlTextActive: { color: colors.primary },
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
    timerModalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.68)',
    },
    timerSheet: {
      paddingTop: 10,
      paddingHorizontal: 18,
      paddingBottom: 28,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timerSheetHandle: {
      alignSelf: 'center',
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.mutedForeground,
      opacity: 0.55,
      marginBottom: 19,
    },
    timerSheetHeading: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 9,
    },
    timerSheetTitle: { color: colors.foreground, fontSize: 19, fontWeight: '700', textAlign: 'right' },
    timerSheetCopy: {
      color: colors.mutedForeground,
      fontSize: 12,
      lineHeight: 20,
      textAlign: 'right',
      marginTop: 7,
      marginBottom: 15,
    },
    timerOptions: { gap: 8 },
    timerOption: {
      minHeight: 49,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: 15,
      backgroundColor: colors.secondary,
    },
    timerOptionText: { color: colors.foreground, fontSize: 14, fontWeight: '600', textAlign: 'right' },
    timerCancelOption: { backgroundColor: colors.muted },
    timerCancelText: { color: colors.mutedForeground, fontSize: 13, fontWeight: '600' },
    emptyTitle: { color: colors.foreground, fontSize: 19, fontWeight: '700', textAlign: 'center', marginTop: 18 },
    emptyCopy: { color: colors.mutedForeground, fontSize: 14, lineHeight: 24, textAlign: 'center', marginTop: 8 },
    pressed: { opacity: 0.72 },
  });
}