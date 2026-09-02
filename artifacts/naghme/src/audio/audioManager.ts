import { Audio, AVPlaybackStatus } from 'expo-av';

export interface AudioPlaybackSnapshot {
  trackId: string | null;
  uri: string | null;
  isLoaded: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  error: string | null;
}

type AudioListener = (snapshot: AudioPlaybackSnapshot) => void;

const initialSnapshot: AudioPlaybackSnapshot = {
  trackId: null,
  uri: null,
  isLoaded: false,
  isLoading: false,
  isPlaying: false,
  isBuffering: false,
  error: null,
};

let snapshot = initialSnapshot;
let sound: Audio.Sound | null = null;
let loadedUri: string | null = null;
let loadedTrackId: string | null = null;
let loadRequest: Promise<void> | null = null;
let audioModeRequest: Promise<void> | null = null;
const listeners = new Set<AudioListener>();

function updateSnapshot(next: Partial<AudioPlaybackSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener(snapshot));
}

function handlePlaybackStatus(status: AVPlaybackStatus): void {
  if (status.isLoaded) {
    updateSnapshot({
      isLoaded: true,
      isLoading: false,
      isPlaying: status.isPlaying,
      isBuffering: status.isBuffering,
      error: null,
    });
    return;
  }

  updateSnapshot({
    isLoaded: false,
    isLoading: false,
    isPlaying: false,
    isBuffering: false,
    error: status.error ? 'پخش این فایل صوتی ممکن نیست.' : snapshot.error,
  });
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

function getFileExtension(uri: string): string | undefined {
  const withoutQuery = uri.split(/[?#]/, 1)[0];
  const extension = withoutQuery.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : undefined;
}

export async function loadAudio(uri: string, trackId: string): Promise<void> {
  if (sound && loadedUri === uri && loadedTrackId === trackId) {
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
      isLoaded: false,
      isLoading: true,
      isPlaying: false,
      isBuffering: false,
      error: null,
    });
    await configureBackgroundAudio();

    if (sound) {
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
      isLoaded: created.status.isLoaded,
      isLoading: false,
      isPlaying: created.status.isLoaded ? created.status.isPlaying : false,
      isBuffering: created.status.isLoaded ? created.status.isBuffering : false,
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
    return false;
  }

  await sound.playAsync();
  return true;
}