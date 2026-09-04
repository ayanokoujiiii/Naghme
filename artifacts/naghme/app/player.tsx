import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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
  nextAudio,
  previousAudio,
  seekAudio,
  setShuffleEnabled,
  setPlaybackQueue,
  RepeatMode,
} from '@/src/audio/audioManager';
import { getLatestJournalMood } from '@/src/db/queries';
import { getDominantCoverColor, withAlpha } from '@/src/player/coverColors';
import { PostcardStudio } from '@/src/components/PostcardStudio';

type SleepTimerOption = 5 | 15 | 30 | 45 | 60 | 'track';

const sleepTimerOptions: Array<{ value: SleepTimerOption; label: string; icon?: 'clock' | 'music' }> = [
  { value: 5, label: '۵ دقیقه' },
  { value: 15, label: '۱۵ دقیقه' },
  { value: 30, label: '۳۰ دقیقه' },
  { value: 45, label: '۴۵ دقیقه' },
  { value: 60, label: '۶۰ دقیقه' },
  { value: 'track', label: 'تا پایان همین قطعه', icon: 'music' },
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
  const [postcardVisible, setPostcardVisible] = useState<boolean>(false);
  const [queueVisible, setQueueVisible] = useState<boolean>(false);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const posterMotionStyle = useMoodPosterStyle(latestMood);

  useEffect(() => subscribeToAudio(setAudio), []);

  useEffect(() => {
    if (!isSliding) setSliderValue(audio.positionMillis);
  }, [audio.positionMillis, isSliding]);

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

  const moveNext = async () => {
    setError('');
    try {
      await nextAudio();
    } catch {
      setError('رفتن به قطعه‌ی بعد انجام نشد.');
    }
  };

  const movePrevious = async () => {
    setError('');
    try {
      await previousAudio();
    } catch {
      setError('رفتن به قطعه‌ی قبل انجام نشد.');
    }
  };

  const toggleShuffle = async () => {
    setError('');
    try {
      await setShuffleEnabled(!audio.shuffleEnabled);
    } catch {
      setError('تغییر حالت تصادفی انجام نشد.');
    }
  };

  const seek = async (value: number) => {
    try {
      await seekAudio(value);
    } catch {
      setError('جابه‌جایی در قطعه انجام نشد.');
    }
  };

  const setPlaybackItem = async (index: number) => {
    setError('');
    try {
      await setPlaybackQueue(audio.queue, index, true);
    } catch {
      setError('پخش قطعه‌ی انتخاب‌شده انجام نشد.');
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
  const displayedPositionMillis = isSliding ? sliderValue : audio.positionMillis;
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
            testID="player-queue"
            accessibilityRole="button"
            accessibilityLabel={`نمایش صف پخش، ${audio.queue.length} قطعه`}
            onPress={() => setQueueVisible(true)}
            style={({ pressed }) => [styles.timerButton, pressed && styles.pressed]}
          >
            <Feather name="list" size={19} color={colors.foreground} />
          </Pressable>
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
          <Animated.View style={[styles.posterInner, posterMotionStyle]}>
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
          </Animated.View>
        </View>

        <View style={styles.metadata}>
          <Text style={styles.title} numberOfLines={2}>{audio.track.title}</Text>
          {audio.track.versionName ? (
            <Text style={styles.version}>{audio.track.versionName}</Text>
          ) : null}
          <Text style={styles.artist}>{audio.track.artistName || 'هنرمند ناشناس'}</Text>
        </View>

        <View style={styles.playback}>
          <Slider
            testID="player-seek"
            accessibilityLabel="جابه‌جایی در قطعه"
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(durationMillis, 1)}
            value={Math.min(displayedPositionMillis, Math.max(durationMillis, 1))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
            disabled={!audio.isLoaded || audio.isBuffering || durationMillis <= 0}
            onSlidingStart={(value) => {
              setIsSliding(true);
              setSliderValue(value);
            }}
            onValueChange={setSliderValue}
            onSlidingComplete={(value) => {
              setIsSliding(false);
              setSliderValue(value);
              void seek(value);
            }}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(displayedPositionMillis)}</Text>
            <Text style={styles.time}>{formatTime(durationMillis)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            testID="player-previous"
            accessibilityRole="button"
            accessibilityLabel="قطعه‌ی قبلی"
            disabled={!audio.queue.length}
            onPress={() => void movePrevious()}
            style={({ pressed }) => [
              styles.iconControl,
              !audio.queue.length && styles.secondaryControlDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="skip-back" size={20} color={colors.foreground} />
          </Pressable>
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
          <Pressable
            testID="player-next"
            accessibilityRole="button"
            accessibilityLabel="قطعه‌ی بعدی"
            disabled={!audio.queue.length}
            onPress={() => void moveNext()}
            style={({ pressed }) => [
              styles.iconControl,
              !audio.queue.length && styles.secondaryControlDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="skip-forward" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.utilityControls}>
          <Pressable
            testID="player-shuffle"
            accessibilityRole="button"
            accessibilityLabel={audio.shuffleEnabled ? 'غیرفعال کردن پخش تصادفی' : 'فعال کردن پخش تصادفی'}
            accessibilityState={{ selected: audio.shuffleEnabled }}
            disabled={!audio.queue.length}
            onPress={() => void toggleShuffle()}
            style={({ pressed }) => [
              styles.utilityControl,
              audio.shuffleEnabled && styles.secondaryControlActive,
              !audio.queue.length && styles.secondaryControlDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="shuffle" size={17} color={audio.shuffleEnabled ? colors.primary : colors.foreground} />
            <Text style={[styles.secondaryControlText, audio.shuffleEnabled && styles.secondaryControlTextActive]}>
              تصادفی
            </Text>
          </Pressable>
          <Pressable
            testID="player-open-queue"
            accessibilityRole="button"
            accessibilityLabel="نمایش صف پخش"
            onPress={() => setQueueVisible(true)}
            style={({ pressed }) => [styles.utilityControl, pressed && styles.pressed]}
          >
            <Feather name="list" size={17} color={colors.foreground} />
            <Text style={styles.secondaryControlText}>صف پخش ({audio.queue.length})</Text>
          </Pressable>
        </View>

        {error || audio.error ? <Text style={styles.errorText}>{error || audio.error}</Text> : null}

        <View style={styles.lyricsSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.lyricsHeadingCopy}>
              <Text style={styles.sectionTitle}>متن ترانه</Text>
              <Feather name="book-open" size={19} color={colors.primary} />
            </View>
            {audio.track.lyrics ? (
              <Pressable
                testID="player-open-postcard"
                accessibilityRole="button"
                accessibilityLabel="ساخت عکس‌نوشته از متن ترانه"
                onPress={() => setPostcardVisible(true)}
                style={({ pressed }) => [styles.lyricsStudioButton, pressed && styles.pressed]}
              >
                <Feather name="image" size={15} color={colors.primary} />
                <Text style={styles.lyricsStudioButtonText}>عکس‌نوشته</Text>
              </Pressable>
            ) : null}
          </View>
          {audio.track.lyrics ? (
            <Text style={styles.lyrics}>{audio.track.lyrics}</Text>
          ) : (
            <Text style={styles.noLyrics}>برای این قطعه هنوز متنی ثبت نشده است.</Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={queueVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQueueVisible(false)}
      >
        <Pressable
          testID="player-queue-backdrop"
          style={styles.timerModalBackdrop}
          onPress={() => setQueueVisible(false)}
        >
          <View style={styles.queueSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.timerSheetHandle} />
            <View style={styles.queueHeading}>
              <Text style={styles.timerSheetTitle}>صف پخش</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="بستن صف پخش"
                onPress={() => setQueueVisible(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Feather name="x" size={21} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView style={styles.queueList}>
              {audio.queue.map((item, index) => (
                <Pressable
                  key={`${item.trackId}-${index}`}
                  testID={`player-queue-item-${item.trackId}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setQueueVisible(false);
                    void setPlaybackItem(index);
                  }}
                  style={({ pressed }) => [
                    styles.queueItem,
                    index === audio.queueIndex && styles.queueItemActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Feather
                    name={index === audio.queueIndex ? 'volume-2' : 'music'}
                    size={17}
                    color={index === audio.queueIndex ? colors.primary : colors.mutedForeground}
                  />
                  <View style={styles.queueItemCopy}>
                    <Text style={styles.queueItemTitle} numberOfLines={1}>{item.metadata.title}</Text>
                    <Text style={styles.queueItemMeta} numberOfLines={1}>
                      {item.metadata.artistName || 'هنرمند ناشناس'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

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
                  <Feather name={option.icon ?? 'clock'} size={17} color={colors.primary} />
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
      <PostcardStudio
        visible={postcardVisible}
        title={audio.track.title}
        lyrics={audio.track.lyrics ?? ''}
        coverImage={audio.track.coverImage}
        artistName={audio.track.artistName ?? undefined}
        onClose={() => setPostcardVisible(false)}
      />
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
  if (mode === 'context') return 'تکرار صف';
  return 'بدون تکرار';
}

function repeatModeShortLabel(mode: RepeatMode): string {
  if (mode === 'track') return 'قطعه';
  if (mode === 'context') return 'صف';
  return 'تکرار';
}

function formatSleepTimer(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainingSeconds = Math.max(0, seconds) % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function useMoodPosterStyle(mood: string | null) {
  const progress = useSharedValue(0);
  const energetic = mood?.trim().includes('پرانرژی') ?? false;

  useEffect(() => {
    progress.value = 0;
    if (energetic) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 450 }),
          withTiming(0, { duration: 450 }),
        ),
        -1,
        false,
      );
    }
  }, [energetic, progress]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.02]) }],
  }));
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
  const normalizedMood = mood?.trim() ?? '';
  const kind = normalizedMood.includes('غمگین')
    ? 'rain'
    : normalizedMood.includes('پرانرژی')
      ? 'energy'
      : normalizedMood.includes('آرام')
        ? 'calm'
        : null;

  if (!kind) return null;
  if (kind === 'rain') {
    return (
      <View pointerEvents="none" style={styles.moodOverlay}>
        {Array.from({ length: 8 }).map((_, index) => (
          <RainParticle
            key={index}
            index={index}
            styles={styles}
          />
        ))}
      </View>
    );
  }

  if (kind === 'calm') {
    return (
      <CalmGlow color={colors.primary} styles={styles} />
    );
  }

  return (
    <EnergyGlow color={colors.primary} styles={styles} />
  );
}

function CalmGlow({
  color,
  styles,
}: {
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 4000 }), -1, true);
  }, [progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.3, 0.7]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.92, 1.08]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.moodOverlay,
        styles.calmGlow,
        { backgroundColor: withAlpha(color, 0.22) },
        animatedStyle,
      ]}
    />
  );
}

function EnergyGlow({
  color,
  styles,
}: {
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 450 }),
        withTiming(0, { duration: 450 }),
      ),
      -1,
      false,
    );
  }, [progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.08, 0.28]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.96, 1.04]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.moodOverlay,
        styles.energyGlow,
        { backgroundColor: withAlpha(color, 0.18) },
        animatedStyle,
      ]}
    />
  );
}

function RainParticle({
  index,
  styles,
}: {
  index: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      index * 150,
      withRepeat(withTiming(1, { duration: 2500 + index * 120 }), -1, false),
    );
  }, [index, progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    left: `${10 + index * 11}%`,
    opacity: interpolate(progress.value, [0, 0.15, 0.8, 1], [0, 0.52, 0.28, 0]),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [-18 - (index % 3) * 14, 145],
        ),
      },
    ],
  }));
  return <Animated.View style={[styles.rainDrop, animatedStyle]} />;
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
    slider: { width: '100%', height: 32 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    time: { color: colors.mutedForeground, fontSize: 11 },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    iconControl: {
      width: 42,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 3,
    },
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
    utilityControls: {
      flexDirection: 'row-reverse',
      justifyContent: 'center',
      gap: 8,
      marginTop: 14,
    },
    utilityControl: {
      minHeight: 38,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      borderRadius: 13,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lyricsSection: {
      marginTop: 30,
      padding: 18,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lyricsHeadingCopy: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    lyricsStudioButton: { minHeight: 34, flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border },
    lyricsStudioButtonText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
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
    queueSheet: {
      maxHeight: '78%',
      paddingTop: 10,
      paddingHorizontal: 18,
      paddingBottom: 24,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    queueHeading: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    queueList: { maxHeight: 430 },
    queueItem: {
      minHeight: 58,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginBottom: 7,
      backgroundColor: colors.secondary,
    },
    queueItemActive: { backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.primary },
    queueItemCopy: { flex: 1, alignItems: 'flex-end' },
    queueItemTitle: { color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right' },
    queueItemMeta: { color: colors.mutedForeground, fontSize: 11, marginTop: 3, textAlign: 'right' },
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