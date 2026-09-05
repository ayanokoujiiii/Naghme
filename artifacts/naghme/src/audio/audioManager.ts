import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logListen, updateListeningHistoryProgress } from '@/src/db/queries';

export interface AudioPlaybackSnapshot {
  trackId: string | null;
  uri: string | null;
  track: AudioTrackMetadata | null;
  isLoaded: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  error: string | null;
  positionMillis: number;
  durationMillis: number;
  repeatMode: RepeatMode;
  isLooping: boolean;
  sleepTimerRemainingSeconds: number;
  queue: AudioQueueItem[];
  queueIndex: number;
  shuffleEnabled: boolean;
}

export interface AudioTrackMetadata {
  title: string;
  coverImage: string | null;
  versionName: string | null;
  artistName: string | null;
  lyrics: string | null;
  durationSeconds: number | null;
}

export interface AudioQueueItem {
  trackId: string;
  uri: string;
  metadata: AudioTrackMetadata;
}

export interface QueueTrackSource {
  id: string;
  title: string;
  audioUri: string | null;
  coverImage: string | null;
  versionName: string | null;
  artistName?: string | null;
  lyrics: string | null;
  duration: number | null;
}

export type RepeatMode = 'off' | 'track' | 'context';

type AudioListener = (snapshot: AudioPlaybackSnapshot) => void;

const initialSnapshot: AudioPlaybackSnapshot = {
  trackId: null,
  uri: null,
  track: null,
  isLoaded: false,
  isLoading: false,
  isPlaying: false,
  isBuffering: false,
  error: null,
  positionMillis: 0,
  durationMillis: 0,
  repeatMode: 'off',
  isLooping: false,
  sleepTimerRemainingSeconds: 0,
  queue: [],
  queueIndex: -1,
  shuffleEnabled: false,
};

let snapshot = initialSnapshot;
let sound: Audio.Sound | null = null;
let loadedUri: string | null = null;
let loadedTrackId: string | null = null;
let loadRequest: Promise<void> | null = null;
let audioModeRequest: Promise<void> | null = null;
let sleepTimerEndsAt: number | null = null;
let sleepTimerHandle: ReturnType<typeof setInterval> | null = null;
let sleepTimerTickInFlight = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let restoringPlaybackState = false;
let shuffleOrder: number[] = [];
let playbackWasPlaying = false;
let completionHandled = false;
let sleepTimerTracksCurrent = false;
interface ActiveListenSession {
  trackId: string;
  historyId: string | null;
  listenedSeconds: number;
  lastPlayingAt: number | null;
}
let activeListenSession: ActiveListenSession | null = null;
const listeners = new Set<AudioListener>();
const PLAYBACK_STATE_KEY = 'naghme.playback-state.v1';

interface PersistedPlaybackState {
  queue: AudioQueueItem[];
  queueIndex: number;
  positionMillis: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
}

function buildShuffleOrder(length: number, firstIndex: number): number[] {
  const rest = Array.from({ length }, (_, index) => index).filter((index) => index !== firstIndex);
  for (let index = rest.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [rest[index], rest[swapIndex]] = [rest[swapIndex], rest[index]];
  }
  return [firstIndex, ...rest];
}

function updateSnapshot(next: Partial<AudioPlaybackSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener(snapshot));
  if (!restoringPlaybackState) {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      const state: PersistedPlaybackState = {
        queue: snapshot.queue,
        queueIndex: snapshot.queueIndex,
        positionMillis: snapshot.positionMillis,
        repeatMode: snapshot.repeatMode,
        shuffleEnabled: snapshot.shuffleEnabled,
      };
      void AsyncStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify(state)).catch(() => undefined);
    }, 350);
  }
}

function finalizeListenSession(durationMillis: number | null): void {
  const session = activeListenSession;
  if (!session) return;
  if (session.lastPlayingAt !== null) {
    session.listenedSeconds += Math.max(0, (Date.now() - session.lastPlayingAt) / 1000);
    session.lastPlayingAt = null;
  }
  if (session.historyId) {
    const durationSeconds =
      durationMillis && durationMillis > 0 ? durationMillis / 1000 : null;
    const completionPercent =
      durationSeconds && durationSeconds > 0
        ? Math.min(100, (session.listenedSeconds / durationSeconds) * 100)
        : null;
    void updateListeningHistoryProgress(
      session.historyId,
      session.listenedSeconds,
      completionPercent,
    ).catch(() => undefined);
  }
  activeListenSession = null;
}

function ensureListenSession(trackId: string): void {
  if (activeListenSession?.trackId === trackId) {
    return;
  }
  finalizeListenSession(snapshot.durationMillis);
  const session: ActiveListenSession = {
    trackId,
    historyId: null,
    listenedSeconds: 0,
    lastPlayingAt: Date.now(),
  };
  activeListenSession = session;
  void logListen(trackId)
    .then((entry) => {
      if (activeListenSession === session) {
        session.historyId = entry.id;
      }
    })
    .catch(() => undefined);
}

function handlePlaybackStatus(status: AVPlaybackStatus): void {
  if (status.isLoaded) {
    if (status.isPlaying && loadedTrackId) {
      ensureListenSession(loadedTrackId);
      if (activeListenSession?.lastPlayingAt === null) {
        activeListenSession.lastPlayingAt = Date.now();
      }
    } else if (activeListenSession && !status.isPlaying && activeListenSession.lastPlayingAt !== null) {
      const session = activeListenSession;
      const startedAt = session.lastPlayingAt;
      if (startedAt === null) return;
      session.listenedSeconds += Math.max(
        0,
        (Date.now() - startedAt) / 1000,
      );
      session.lastPlayingAt = null;
    }
    playbackWasPlaying = status.isPlaying;
    updateSnapshot({
      isLoaded: true,
      isLoading: false,
      isPlaying: status.isPlaying,
      isBuffering: status.isBuffering,
      error: null,
      positionMillis: status.positionMillis,
      durationMillis: status.durationMillis,
      isLooping: status.isLooping,
      sleepTimerRemainingSeconds: sleepTimerTracksCurrent
        ? Math.max(0, Math.ceil(((status.durationMillis ?? 0) - status.positionMillis) / 1000))
        : snapshot.sleepTimerRemainingSeconds,
    });
    if (status.didJustFinish && !completionHandled) {
      completionHandled = true;
      finalizeListenSession(status.durationMillis ?? null);
      if (sleepTimerTracksCurrent) {
        void finishSleepTimer();
      } else if (snapshot.repeatMode !== 'track') {
        void nextAudio(true);
      }
    }
    return;
  }

  updateSnapshot({
    isLoaded: false,
    isLoading: false,
    isPlaying: false,
    isBuffering: false,
    error: status.error ? 'پخش این فایل صوتی ممکن نیست.' : snapshot.error,
    positionMillis: 0,
  });
  playbackWasPlaying = false;
  finalizeListenSession(snapshot.durationMillis);
}

export function getAudioSnapshot(): AudioPlaybackSnapshot {
  return snapshot;
}

export function subscribeToAudio(listener: AudioListener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

export function configureBackgroundAudio(): Promise<void> {
  if (!audioModeRequest) {
    audioModeRequest = Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch((error: unknown) => {
      audioModeRequest = null;
      throw error;
    });
  }
  return audioModeRequest;
}

async function restorePlaybackState(): Promise<void> {
  const raw = await AsyncStorage.getItem(PLAYBACK_STATE_KEY).catch(() => null);
  if (!raw) return;
  try {
    const persisted = JSON.parse(raw) as Partial<PersistedPlaybackState>;
    const queue = Array.isArray(persisted.queue)
      ? persisted.queue.filter(
          (item): item is AudioQueueItem =>
            Boolean(
              item &&
                typeof item.trackId === 'string' &&
                typeof item.uri === 'string' &&
                item.metadata &&
                typeof item.metadata.title === 'string',
            ),
        )
      : [];
    if (!queue.length) return;
    const queueIndex = Math.min(Math.max(Number(persisted.queueIndex ?? 0), 0), queue.length - 1);
    restoringPlaybackState = true;
    updateSnapshot({
      queue,
      queueIndex,
      repeatMode:
        persisted.repeatMode === 'track' || persisted.repeatMode === 'context'
          ? persisted.repeatMode
          : 'off',
      shuffleEnabled: persisted.shuffleEnabled === true,
    });
    shuffleOrder = persisted.shuffleEnabled === true ? buildShuffleOrder(queue.length, queueIndex) : [];
    restoringPlaybackState = false;
    await loadAudio(queue[queueIndex].uri, queue[queueIndex].trackId, queue[queueIndex].metadata);
    if (Number(persisted.positionMillis) > 0) {
      await seekAudio(Number(persisted.positionMillis));
    }
  } catch {
    restoringPlaybackState = false;
    await AsyncStorage.removeItem(PLAYBACK_STATE_KEY).catch(() => undefined);
  }
}

void restorePlaybackState();

function getFileExtension(uri: string): string | undefined {
  const withoutQuery = uri.split(/[?#]/, 1)[0];
  const extension = withoutQuery.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : undefined;
}

export async function loadAudio(
  uri: string,
  trackId: string,
  track: AudioTrackMetadata,
): Promise<void> {
  const queueItem: AudioQueueItem = { trackId, uri, metadata: track };
  if (!snapshot.queue.some((item) => item.trackId === trackId && item.uri === uri)) {
    updateSnapshot({ queue: [queueItem], queueIndex: 0 });
  }
  if (sound && loadedUri === uri && loadedTrackId === trackId) {
    updateSnapshot({ trackId, uri, track });
    return;
  }
  if (loadRequest) {
    await loadRequest;
    if (sound && loadedUri === uri && loadedTrackId === trackId) {
      return;
    }
  }

  const request = (async () => {
    updateSnapshot({
      trackId,
      uri,
      track,
      isLoaded: false,
      isLoading: true,
      isPlaying: false,
      isBuffering: false,
      error: null,
      positionMillis: 0,
      durationMillis: track.durationSeconds ? track.durationSeconds * 1000 : 0,
    });
    playbackWasPlaying = false;
    completionHandled = false;
    await configureBackgroundAudio();

    if (sound) {
      finalizeListenSession(snapshot.durationMillis);
      const previousSound = sound;
      sound = null;
      loadedUri = null;
      loadedTrackId = null;
      await previousSound.unloadAsync().catch(() => undefined);
    }

    const extension = getFileExtension(uri);
    const source = extension
      ? { uri, overrideFileExtensionAndroid: extension }
      : { uri };
    const created = await Audio.Sound.createAsync(
      source,
      {
        shouldPlay: false,
        isLooping: snapshot.repeatMode === 'track',
        progressUpdateIntervalMillis: 500,
        androidImplementation: 'ExoPlayer',
      },
      handlePlaybackStatus,
    );

    sound = created.sound;
    loadedUri = uri;
    loadedTrackId = trackId;
    updateSnapshot({
      trackId,
      uri,
      track,
      isLoaded: created.status.isLoaded,
      isLoading: false,
      isPlaying: created.status.isLoaded ? created.status.isPlaying : false,
      isBuffering: created.status.isLoaded ? created.status.isBuffering : false,
      positionMillis: created.status.isLoaded ? created.status.positionMillis : 0,
      durationMillis: created.status.isLoaded
        ? created.status.durationMillis
        : track.durationSeconds
          ? track.durationSeconds * 1000
          : 0,
      isLooping: created.status.isLoaded
        ? created.status.isLooping
        : snapshot.repeatMode === 'track',
      error: created.status.isLoaded
        ? null
        : created.status.error
          ? 'بارگذاری فایل صوتی انجام نشد.'
          : null,
    });
  })();

  loadRequest = request;
  try {
    await request;
  } catch (error: unknown) {
    updateSnapshot({
      isLoaded: false,
      isLoading: false,
      isPlaying: false,
      isBuffering: false,
      error: error instanceof Error ? 'بارگذاری فایل صوتی انجام نشد.' : 'پخش این فایل صوتی ممکن نیست.',
    });
    throw error;
  } finally {
    if (loadRequest === request) {
      loadRequest = null;
    }
  }
}

export async function toggleAudioPlayback(): Promise<boolean> {
  if (loadRequest) {
    await loadRequest;
  }
  if (!sound) return false;

  const status = await sound.getStatusAsync();
  if (!status.isLoaded) return false;
  if (status.isPlaying) {
    await sound.pauseAsync();
    playbackWasPlaying = false;
    return false;
  }

  await sound.playAsync();
  if (!playbackWasPlaying && loadedTrackId) {
    playbackWasPlaying = true;
    ensureListenSession(loadedTrackId);
  }
  return true;
}

export async function playAudio(): Promise<boolean> {
  if (loadRequest) {
    await loadRequest;
  }
  if (!sound) return false;

  const status = await sound.getStatusAsync();
  if (!status.isLoaded) return false;
  if (!status.isPlaying) {
    await sound.playAsync();
    if (!playbackWasPlaying && loadedTrackId) {
      playbackWasPlaying = true;
    ensureListenSession(loadedTrackId);
    }
  }
  return true;
}

export async function seekAudio(positionMillis: number): Promise<number> {
  if (loadRequest) await loadRequest;
  if (!sound) return 0;
  const status = await sound.getStatusAsync();
  if (!status.isLoaded) return 0;
  const maxPosition = status.durationMillis ?? Math.max(0, positionMillis);
  const nextPosition = Math.min(Math.max(0, positionMillis), maxPosition);
  await sound.setPositionAsync(nextPosition);
  updateSnapshot({ positionMillis: nextPosition });
  return nextPosition;
}

function createQueueItem(track: QueueTrackSource): AudioQueueItem | null {
  if (!track.audioUri) return null;
  return {
    trackId: track.id,
    uri: track.audioUri,
    metadata: {
      title: track.title,
      coverImage: track.coverImage,
      versionName: track.versionName,
      artistName: track.artistName ?? null,
      lyrics: track.lyrics,
      durationSeconds: track.duration,
    },
  };
}

export async function playTracksInQueue(
  tracks: QueueTrackSource[],
  startIndex: number,
): Promise<boolean> {
  const playableTracks = tracks
    .map(createQueueItem)
    .filter((item): item is AudioQueueItem => item !== null);
  if (!playableTracks.length) return false;
  const requestedTrackId = tracks[startIndex]?.id;
  const playableIndex = Math.max(
    0,
    playableTracks.findIndex((item) => item.trackId === requestedTrackId),
  );
  return setPlaybackQueue(playableTracks, playableIndex, true);
}

export async function setPlaybackQueue(
  queue: AudioQueueItem[],
  startIndex = 0,
  autoPlay = true,
): Promise<boolean> {
  if (!queue.length) return false;
  const safeIndex = Math.min(Math.max(0, startIndex), queue.length - 1);
  updateSnapshot({
    queue,
    queueIndex: safeIndex,
    trackId: null,
    uri: null,
    track: null,
    isLoaded: false,
    isLoading: false,
    isPlaying: false,
    error: null,
    positionMillis: 0,
    durationMillis: queue[safeIndex].metadata.durationSeconds
      ? queue[safeIndex].metadata.durationSeconds * 1000
      : 0,
  });
  shuffleOrder = snapshot.shuffleEnabled ? buildShuffleOrder(queue.length, safeIndex) : [];
  await loadAudio(queue[safeIndex].uri, queue[safeIndex].trackId, queue[safeIndex].metadata);
  if (!autoPlay) return true;
  return playAudio();
}

function getNextQueueIndex(direction: 1 | -1): number | null {
  const length = snapshot.queue.length;
  if (!length) return null;
  if (snapshot.shuffleEnabled) {
    const order = shuffleOrder.length === length ? shuffleOrder : buildShuffleOrder(length, snapshot.queueIndex);
    shuffleOrder = order;
    const currentPosition = order.indexOf(snapshot.queueIndex);
    const nextPosition = currentPosition + direction;
    if (nextPosition >= 0 && nextPosition < length) return order[nextPosition];
    return snapshot.repeatMode === 'context' ? order[direction === 1 ? 0 : length - 1] : null;
  }
  const next = snapshot.queueIndex + direction;
  if (next >= 0 && next < length) return next;
  return snapshot.repeatMode === 'context' ? (direction === 1 ? 0 : length - 1) : null;
}

async function playQueueIndex(index: number): Promise<boolean> {
  const item = snapshot.queue[index];
  if (!item) return false;
  updateSnapshot({ queueIndex: index, error: null });
  try {
    await loadAudio(item.uri, item.trackId, item.metadata);
    return playAudio();
  } catch {
    updateSnapshot({ error: 'بارگذاری یکی از فایل‌های صف انجام نشد.' });
    return false;
  }
}

export async function nextAudio(fromCompletion = false): Promise<boolean> {
  if (!snapshot.queue.length) return false;
  const nextIndex = getNextQueueIndex(1);
  if (nextIndex === null) {
    if (fromCompletion) updateSnapshot({ error: 'صف پخش به پایان رسید.' });
    return false;
  }
  return playQueueIndex(nextIndex);
}

export async function previousAudio(): Promise<boolean> {
  if (!snapshot.queue.length) return false;
  if (!snapshot.isLoaded || snapshot.positionMillis > 3000) {
    await seekAudio(0);
    return true;
  }
  const previousIndex = getNextQueueIndex(-1);
  if (previousIndex === null) return false;
  return playQueueIndex(previousIndex);
}

export async function setShuffleEnabled(enabled: boolean): Promise<boolean> {
  shuffleOrder = enabled ? buildShuffleOrder(snapshot.queue.length, Math.max(0, snapshot.queueIndex)) : [];
  updateSnapshot({ shuffleEnabled: enabled });
  return enabled;
}

function clearSleepTimerInterval(): void {
  if (sleepTimerHandle) {
    clearInterval(sleepTimerHandle);
    sleepTimerHandle = null;
  }
  sleepTimerEndsAt = null;
  sleepTimerTickInFlight = false;
  sleepTimerTracksCurrent = false;
}

async function finishSleepTimer(): Promise<void> {
  clearSleepTimerInterval();
  try {
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await sound.pauseAsync();
      }
    }
  } catch {
    // The sound may be unloading at the same moment the timer expires.
  } finally {
    updateSnapshot({ sleepTimerRemainingSeconds: 0 });
  }
}

async function tickSleepTimer(): Promise<void> {
  if (!sleepTimerEndsAt || sleepTimerTickInFlight) return;
  sleepTimerTickInFlight = true;
  try {
    const remaining = Math.max(0, Math.ceil((sleepTimerEndsAt - Date.now()) / 1000));
    if (remaining <= 0) {
      await finishSleepTimer();
    } else {
      updateSnapshot({ sleepTimerRemainingSeconds: remaining });
    }
  } finally {
    sleepTimerTickInFlight = false;
  }
}

export function setSleepTimer(minutes: 5 | 15 | 30 | 45 | 60 | 'track' | null): void {
  clearSleepTimerInterval();
  if (minutes === null) {
    updateSnapshot({ sleepTimerRemainingSeconds: 0 });
    return;
  }
  if (minutes === 'track') {
    sleepTimerTracksCurrent = true;
    updateSnapshot({
      sleepTimerRemainingSeconds: Math.max(
        0,
        Math.ceil((snapshot.durationMillis - snapshot.positionMillis) / 1000),
      ),
    });
    return;
  }

  sleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
  updateSnapshot({ sleepTimerRemainingSeconds: minutes * 60 });
  sleepTimerHandle = setInterval(() => {
    void tickSleepTimer();
  }, 1000);
}

export async function stopAndUnloadAudio(): Promise<void> {
  clearSleepTimerInterval();
  if (loadRequest) {
    await loadRequest.catch(() => undefined);
  }
  finalizeListenSession(snapshot.durationMillis);

  const activeSound = sound;
  sound = null;
  loadedUri = null;
  loadedTrackId = null;

  if (activeSound) {
    await activeSound.stopAsync().catch(() => undefined);
    await activeSound.unloadAsync().catch(() => undefined);
  }

  updateSnapshot({
    trackId: null,
    uri: null,
    track: null,
    isLoaded: false,
    isLoading: false,
    isPlaying: false,
    isBuffering: false,
    error: null,
    positionMillis: 0,
    durationMillis: 0,
    repeatMode: 'off',
    isLooping: false,
    sleepTimerRemainingSeconds: 0,
    queue: [],
    queueIndex: -1,
    shuffleEnabled: false,
  });
  playbackWasPlaying = false;
  completionHandled = false;
}

export async function rewindAudio(milliseconds = 10000): Promise<number> {
  if (loadRequest) {
    await loadRequest;
  }
  if (!sound) return 0;

  const status = await sound.getStatusAsync();
  if (!status.isLoaded) return 0;

  const nextPosition = Math.max(0, status.positionMillis - milliseconds);
  await sound.setPositionAsync(nextPosition);
  updateSnapshot({ positionMillis: nextPosition });
  return nextPosition;
}

export async function setRepeatMode(mode: RepeatMode): Promise<RepeatMode> {
  if (sound) {
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      await sound.setIsLoopingAsync(mode === 'track');
    }
  }
  updateSnapshot({ repeatMode: mode, isLooping: mode === 'track' });
  return mode;
}

export async function cycleRepeatMode(): Promise<RepeatMode> {
  const nextMode: RepeatMode =
    snapshot.repeatMode === 'off'
      ? 'track'
      : snapshot.repeatMode === 'track'
        ? 'context'
        : 'off';
  return setRepeatMode(nextMode);
}