import { useEffect, useState } from 'react';
import {
  getAudioSnapshot,
  subscribeToAudio,
} from '@/src/audio/audioManager';

export const MINI_PLAYER_CONTENT_PADDING = 96;

export function useMiniPlayerActive(): boolean {
  const [active, setActive] = useState<boolean>(() => {
    const audio = getAudioSnapshot();
    return Boolean(audio.trackId && audio.uri && (audio.isLoaded || audio.isLoading || audio.error));
  });

  useEffect(
    () =>
      subscribeToAudio((audio) => {
        setActive(Boolean(audio.trackId && audio.uri && (audio.isLoaded || audio.isLoading || audio.error)));
      }),
    [],
  );

  return active;
}