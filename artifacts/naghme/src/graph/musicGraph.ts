import { getDatabase } from '@/src/db/database';

export type MusicGraphNodeType = 'artist' | 'album' | 'track' | 'work' | 'version';

export type MusicGraphEdgeType =
  | 'artist-album'
  | 'artist-track'
  | 'album-track'
  | 'work-version'
  | 'track-work'
  | 'track-version'
  | 'credit'
  | 'artist-artist';

export interface MusicGraphNode {
  id: string;
  type: MusicGraphNodeType;
  label: string;
  subtitle: string | null;
  imageUri: string | null;
  durationSeconds?: number | null;
  audioUri?: string | null;
  artistName?: string | null;
  coverImage?: string | null;
  lyrics?: string | null;
  sheetMusicUri?: string | null;
  versionName?: string | null;
  workId?: string | null;
  versionId?: string | null;
  albumId?: string | null;
}

export interface MusicGraphEdge {
  id: string;
  from: string;
  to: string;
  type: MusicGraphEdgeType;
  label: string | null;
}

export interface MusicGraphData {
  nodes: MusicGraphNode[];
  edges: MusicGraphEdge[];
}

type ArtistRow = {
  id: string;
  name: string;
  type: string | null;
  profileImage: string | null;
  image: string | null;
};

type AlbumRow = {
  id: string;
  title: string;
  releaseYear: number | null;
  coverImage: string | null;
};

type TrackRow = {
  id: string;
  title: string;
  duration: number | null;
  audioUri: string | null;
  artistId: string | null;
  albumId: string | null;
  coverImage: string | null;
  lyrics: string | null;
  sheetMusicUri: string | null;
  versionName: string | null;
  workId: string | null;
  versionId: string | null;
};

type WorkRow = { id: string; title: string; genre: string | null };
type VersionRow = { id: string; name: string; kind: string | null };

export async function getMusicGraphData(): Promise<MusicGraphData> {
  const database = await getDatabase();
  if (!database) throw new Error('ذخیره‌سازی SQLite در این محیط در دسترس نیست.');

  const [
    artists,
    albums,
    tracks,
    works,
    versions,
    artistAlbums,
    albumTracks,
    trackWorks,
    trackVersions,
    workVersions,
    credits,
    artistRelationships,
  ] = await Promise.all([
    database.getAllAsync<ArtistRow>(
      'SELECT id, name, type, profileImage, image FROM Artists ORDER BY name COLLATE NOCASE ASC',
    ),
    database.getAllAsync<AlbumRow>(
      'SELECT id, title, releaseYear, coverImage FROM Albums ORDER BY title COLLATE NOCASE ASC',
    ),
    database.getAllAsync<TrackRow>(
      'SELECT id, title, duration, audioUri, artistId, albumId, coverImage, lyrics, sheetMusicUri, versionName, workId, versionId FROM Tracks ORDER BY title COLLATE NOCASE ASC',
    ),
    database.getAllAsync<WorkRow>(
      'SELECT id, title, genre FROM Works ORDER BY title COLLATE NOCASE ASC',
    ),
    database.getAllAsync<VersionRow>(
      'SELECT id, name, kind FROM Versions ORDER BY name COLLATE NOCASE ASC',
    ),
    database.getAllAsync<{ artistId: string; albumId: string; source: string }>(
      'SELECT artistId, albumId, source FROM ArtistAlbums',
    ),
    database.getAllAsync<{ albumId: string; trackId: string }>(
      `SELECT albumId, trackId
         FROM AlbumTracks
        ORDER BY albumId, CASE WHEN discNumber IS NULL OR trackNumber IS NULL THEN 1 ELSE 0 END,
                 discNumber, trackNumber, trackId`,
    ),
    database.getAllAsync<{ trackId: string; workId: string }>(
      'SELECT id AS trackId, workId FROM Tracks WHERE workId IS NOT NULL',
    ),
    database.getAllAsync<{ trackId: string; versionId: string }>(
      'SELECT id AS trackId, versionId FROM Tracks WHERE versionId IS NOT NULL',
    ),
    database.getAllAsync<{ versionId: string; workId: string }>(
      'SELECT id AS versionId, workId FROM Versions',
    ),
    database.getAllAsync<{
      id: string;
      artistId: string;
      workId: string | null;
      trackId: string | null;
      albumId: string | null;
      roleName: string;
    }>(
      `SELECT Credits.id, Credits.artistId, Credits.workId, Credits.trackId, Credits.albumId,
              Roles.name AS roleName
         FROM Credits
         INNER JOIN Roles ON Roles.id = Credits.roleId
        ORDER BY Credits.createdAt ASC`,
    ),
    database.getAllAsync<{
      id: string;
      artistId: string;
      relatedArtistId: string;
      description: string | null;
    }>(
      `SELECT id, artistId, relatedArtistId, description
         FROM ArtistRelationships
        ORDER BY createdAt ASC`,
    ),
  ]);

  const nodes: MusicGraphNode[] = [
    ...artists.map((artist) => ({
      id: artist.id,
      type: 'artist' as const,
      label: artist.name,
      subtitle: artist.type,
      imageUri: artist.profileImage ?? artist.image,
    })),
    ...albums.map((album) => ({
      id: album.id,
      type: 'album' as const,
      label: album.title,
      subtitle: album.releaseYear ? `سال ${album.releaseYear}` : 'آلبوم',
      imageUri: album.coverImage,
    })),
    ...tracks.map((track) => ({
      id: track.id,
      type: 'track' as const,
      label: track.title,
      subtitle: track.artistId ? 'قطعه' : 'قطعه‌ی مستقل',
      imageUri: track.coverImage,
      durationSeconds: track.duration,
      audioUri: track.audioUri,
      coverImage: track.coverImage,
      lyrics: track.lyrics,
      sheetMusicUri: track.sheetMusicUri,
      versionName: track.versionName,
      workId: track.workId,
      versionId: track.versionId,
      albumId: track.albumId,
      artistName: artists.find((artist) => artist.id === track.artistId)?.name ?? null,
    })),
    ...works.map((work) => ({
      id: work.id,
      type: 'work' as const,
      label: work.title,
      subtitle: work.genre ?? 'اثر',
      imageUri: null,
    })),
    ...versions.map((version) => ({
      id: version.id,
      type: 'version' as const,
      label: version.name,
      subtitle: version.kind ?? 'نسخه',
      imageUri: null,
    })),
  ];

  const edges: MusicGraphEdge[] = [
    ...artistAlbums.map((link) => ({
      id: `artist-album:${link.artistId}:${link.albumId}`,
      from: link.artistId,
      to: link.albumId,
      type: 'artist-album' as const,
      label: link.source === 'explicit' ? 'آلبوم هنرمند' : 'ارتباط ثبت‌شده',
    })),
    ...albumTracks.map((link) => ({
      id: `album-track:${link.albumId}:${link.trackId}`,
      from: link.albumId,
      to: link.trackId,
      type: 'album-track' as const,
      label: 'عضویت در آلبوم',
    })),
    ...tracks
      .filter((track) => track.artistId)
      .map((track) => ({
        id: `artist-track:${track.artistId}:${track.id}`,
        from: track.artistId as string,
        to: track.id,
        type: 'artist-track' as const,
        label: 'هنرمند قطعه',
      })),
    ...trackWorks.map((link) => ({
      id: `track-work:${link.trackId}:${link.workId}`,
      from: link.trackId,
      to: link.workId,
      type: 'track-work' as const,
      label: 'اثر',
    })),
    ...trackVersions.map((link) => ({
      id: `track-version:${link.trackId}:${link.versionId}`,
      from: link.trackId,
      to: link.versionId,
      type: 'track-version' as const,
      label: 'نسخه',
    })),
    ...workVersions.map((link) => ({
      id: `work-version:${link.workId}:${link.versionId}`,
      from: link.workId,
      to: link.versionId,
      type: 'work-version' as const,
      label: 'نسخه‌ی اثر',
    })),
    ...credits.flatMap((credit) => {
      const target = credit.workId ?? credit.trackId ?? credit.albumId;
      if (!target) return [];
      return [{
        id: `credit:${credit.id}`,
        from: credit.artistId,
        to: target,
        type: 'credit' as const,
        label: credit.roleName,
      }];
    }),
    ...artistRelationships.map((relationship) => ({
      id: `artist-artist:${relationship.artistId}:${relationship.relatedArtistId}`,
      from: relationship.artistId,
      to: relationship.relatedArtistId,
      type: 'artist-artist' as const,
      label: relationship.description ?? 'رابطه‌ی هنرمندان',
    })),
  ];

  return { nodes, edges };
}