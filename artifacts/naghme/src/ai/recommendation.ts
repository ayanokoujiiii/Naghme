import type { RecommendationTrack } from '@/src/db/queries';

export interface LocalRecommendation {
  track: RecommendationTrack;
  title: string;
  recommendation: string;
  culturalNote: string;
}

const moodLabels = ['آرام', 'غمگین', 'متفکر', 'پرانرژی'] as const;

export function isKnownMood(value: string): boolean {
  return moodLabels.includes(value as (typeof moodLabels)[number]);
}

export function selectLocalRecommendation(
  tracks: RecommendationTrack[],
  currentMood: string,
): LocalRecommendation | null {
  if (!tracks.length) return null;

  const now = Date.now();
  const scored = tracks.map((track) => {
    const moodMatch = track.recentMoods?.includes(currentMood) ? 100 : 0;
    const neverListened = track.lastListenedAt ? 0 : 42;
    const daysSinceListen = track.lastListenedAt
      ? Math.max(0, (now - new Date(track.lastListenedAt).getTime()) / 86400000)
      : 30;
    const staleScore = Math.min(daysSinceListen, 90) * 0.65;
    const freshnessPenalty = Math.min(track.listeningCount, 20) * 1.4;
    const favoriteBonus = track.favorite ? 8 : 0;
    return {
      track,
      score: moodMatch + neverListened + staleScore + favoriteBonus - freshnessPenalty,
    };
  });

  scored.sort((left, right) => right.score - left.score);
  const track = scored[0].track;
  const artist = track.artistName ? ` از ${track.artistName}` : '';
  const moodSentence = track.recentMoods?.includes(currentMood)
    ? `ردپای حال «${currentMood}» هم در دفترچه‌ات دیده می‌شود.`
    : `برای حال «${currentMood}»، ضرباهنگ و فضای این قطعه می‌تواند همراه خوبی باشد.`;
  const culturalNote = track.albumTitle
    ? `این پیشنهاد از آلبوم «${track.albumTitle}»${artist} است؛ آن را با چند دقیقه خلوت شروع کن.`
    : `این قطعه${artist} را امشب بدون عجله و با چند دقیقه خلوت گوش کن.`;

  return {
    track,
    title: `امشب با «${track.title}»`,
    recommendation: `این قطعه${artist} را برای امشب کنار گذاشتم. ${moodSentence}`,
    culturalNote,
  };
}

export function createGeminiSummary(tracks: RecommendationTrack[]): string {
  return tracks
    .slice(0, 24)
    .map((track) => {
      const lastListened = track.lastListenedAt ?? 'هرگز شنیده نشده';
      const moods = track.recentMoods ?? 'بدون ثبت حال';
      return [
        `قطعه: ${track.title}`,
        `هنرمند: ${track.artistName ?? 'نامشخص'}`,
        `آلبوم: ${track.albumTitle ?? 'بدون آلبوم'}`,
        `تعداد شنیدن: ${track.listeningCount}`,
        `آخرین شنیدن: ${lastListened}`,
        `حال‌های اخیر: ${moods}`,
        `علاقه‌مندی: ${track.favorite ? 'بله' : 'خیر'}`,
      ].join(' | ');
    })
    .join('\n');
}