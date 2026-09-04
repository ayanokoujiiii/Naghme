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
type VersionRow = { id: string; name: string; kind: string | null; workId?: string | null };

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
      label: link.source === 'explicit' ? 'آلبوم هنرمند' : 'از روی قطعه‌ها',
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
    ...artistRelationships.reduce<MusicGraphEdge[]>((result, relationship) => {
      const id = artistRelationshipEdgeId(relationship.artistId, relationship.relatedArtistId);
      if (result.some((edge) => edge.id === id)) return result;
      result.push({
        id,
        from: relationship.artistId,
        to: relationship.relatedArtistId,
        type: 'artist-artist',
        label: relationship.description ?? 'رابطه‌ی هنرمندان',
      });
      return result;
    }, []),
  ];

  return { nodes, edges };
}

type MusicGraphDatabase = NonNullable<Awaited<ReturnType<typeof getDatabase>>>;

type ArtistRelationshipRow = {
  id: string;
  artistId: string;
  relatedArtistId: string;
  description: string | null;
};

type CreditRow = {
  id: string;
  artistId: string;
  workId: string | null;
  trackId: string | null;
  albumId: string | null;
  roleName: string;
};

type AlbumTrackLink = {
  albumId: string;
  trackId: string;
  discNumber: number | null;
  trackNumber: number | null;
};

type NeighborhoodEdge = MusicGraphEdge & {
  fromType: MusicGraphNodeType;
  toType: MusicGraphNodeType;
};

/**
 * Loads only the records needed to render one focused entity and its direct
 * relationships. The full graph loader above remains available for non-UI
 * consumers, but the graph screen should not pay for a complete archive dump.
 */
export async function getMusicGraphNeighborhood(
  requestedType: MusicGraphNodeType | null,
  focusId: string,
): Promise<MusicGraphData> {
  const database = await getDatabase();
  if (!database) throw new Error('ذخیره‌سازی SQLite در این محیط در دسترس نیست.');
  if (!focusId.trim()) return { nodes: [], edges: [] };

  const focusType = requestedType ?? await resolveNodeType(database, focusId);
  if (!focusType) return { nodes: [], edges: [] };

  const required = new Map<MusicGraphNodeType, Set<string>>();
  const edges: NeighborhoodEdge[] = [];
  const edgeIds = new Set<string>();
  const requireNode = (type: MusicGraphNodeType, id: string | null | undefined) => {
    if (!id) return;
    const ids = required.get(type) ?? new Set<string>();
    ids.add(id);
    required.set(type, ids);
  };
  const addEdge = (
    id: string,
    from: string,
    fromType: MusicGraphNodeType,
    to: string,
    toType: MusicGraphNodeType,
    type: MusicGraphEdgeType,
    label: string | null,
  ) => {
    if (edgeIds.has(id)) return;
    edgeIds.add(id);
    requireNode(fromType, from);
    requireNode(toType, to);
    edges.push({ id, from, fromType, to, toType, type, label });
  };

  requireNode(focusType, focusId);
  const centerRow = await getNeighborhoodCenter(database, focusType, focusId);
  if (!centerRow) return { nodes: [], edges: [] };

  if (focusType === 'artist') {
    const [artistAlbums, artistTracks, relationships, credits] = await Promise.all([
      database.getAllAsync<{ artistId: string; albumId: string; source: string }>(
        'SELECT artistId, albumId, source FROM ArtistAlbums WHERE artistId = ?',
        [focusId],
      ),
      database.getAllAsync<{ trackId: string }>(
        'SELECT id AS trackId FROM Tracks WHERE artistId = ?',
        [focusId],
      ),
      database.getAllAsync<ArtistRelationshipRow>(
        `SELECT id, artistId, relatedArtistId, description
           FROM ArtistRelationships
          WHERE artistId = ? OR relatedArtistId = ?
          ORDER BY createdAt ASC`,
        [focusId, focusId],
      ),
      getCreditsForGraphTarget(database, 'artist', focusId),
    ]);

    artistAlbums.forEach((link) => {
      addEdge(
        `artist-album:${link.artistId}:${link.albumId}`,
        link.artistId,
        'artist',
        link.albumId,
        'album',
        'artist-album',
        link.source === 'explicit' ? 'آلبوم هنرمند' : 'از روی قطعه‌ها',
      );
    });
    artistTracks.forEach((track) => {
      addEdge(`artist-track:${focusId}:${track.trackId}`, focusId, 'artist', track.trackId, 'track', 'artist-track', 'قطعه‌ی هنرمند');
    });
    relationships.forEach((relationship) => {
      const relatedArtistId = relationship.artistId === focusId
        ? relationship.relatedArtistId
        : relationship.artistId;
      addEdge(
        artistRelationshipEdgeId(focusId, relatedArtistId),
        focusId,
        'artist',
        relatedArtistId,
        'artist',
        'artist-artist',
        relationship.description ?? 'رابطه‌ی هنرمندان',
      );
    });
    addCreditEdges(addEdge, credits, focusId, 'artist', focusId);
  } else if (focusType === 'album') {
    const [artistAlbums, albumTracks, credits] = await Promise.all([
      database.getAllAsync<{ artistId: string; albumId: string; source: string }>(
        'SELECT artistId, albumId, source FROM ArtistAlbums WHERE albumId = ?',
        [focusId],
      ),
      getAlbumTrackLinks(database, focusId),
      getCreditsForGraphTarget(database, 'album', focusId),
    ]);

    artistAlbums.forEach((link) => {
      addEdge(
        `artist-album:${link.artistId}:${link.albumId}`,
        link.artistId,
        'artist',
        link.albumId,
        'album',
        'artist-album',
        link.source === 'explicit' ? 'آلبوم هنرمند' : 'از روی قطعه‌ها',
      );
    });
    albumTracks.forEach((link) => {
      addEdge(`album-track:${link.albumId}:${link.trackId}`, link.albumId, 'album', link.trackId, 'track', 'album-track', 'عضویت در آلبوم');
    });
    addCreditEdges(addEdge, credits, focusId, 'album', focusId);
  } else if (focusType === 'track') {
    const track = centerRow as TrackRow;
    const [albumMemberships, credits] = await Promise.all([
      database.getAllAsync<AlbumTrackLink>(
        `SELECT albumId, trackId, discNumber, trackNumber
           FROM AlbumTracks
          WHERE trackId = ?
          ORDER BY albumId, discNumber, trackNumber`,
        [focusId],
      ),
      getCreditsForGraphTarget(database, 'track', focusId),
    ]);

    if (track.artistId) {
      addEdge(`artist-track:${track.artistId}:${track.id}`, track.artistId, 'artist', track.id, 'track', 'artist-track', 'هنرمند قطعه');
    }
    if (track.workId) {
      addEdge(`track-work:${track.id}:${track.workId}`, track.id, 'track', track.workId, 'work', 'track-work', 'اثر');
    }
    if (track.versionId) {
      addEdge(`track-version:${track.id}:${track.versionId}`, track.id, 'track', track.versionId, 'version', 'track-version', 'نسخه');
    }
    addCreditEdges(addEdge, credits, focusId, 'track', focusId);

    albumMemberships.forEach((link) => {
      addEdge(`album-track:${link.albumId}:${link.trackId}`, link.albumId, 'album', link.trackId, 'track', 'album-track', 'عضویت در آلبوم');
    });
  } else if (focusType === 'work') {
    const [tracks, versions, credits] = await Promise.all([
      database.getAllAsync<{ trackId: string }>(
        'SELECT id AS trackId FROM Tracks WHERE workId = ? ORDER BY title COLLATE NOCASE ASC',
        [focusId],
      ),
      database.getAllAsync<{ versionId: string }>(
        'SELECT id AS versionId FROM Versions WHERE workId = ? ORDER BY name COLLATE NOCASE ASC',
        [focusId],
      ),
      getCreditsForGraphTarget(database, 'work', focusId),
    ]);
    tracks.forEach((track) => {
      addEdge(`track-work:${track.trackId}:${focusId}`, track.trackId, 'track', focusId, 'work', 'track-work', 'اثر');
    });
    versions.forEach((version) => {
      addEdge(`work-version:${focusId}:${version.versionId}`, focusId, 'work', version.versionId, 'version', 'work-version', 'نسخه‌ی اثر');
    });
    addCreditEdges(addEdge, credits, focusId, 'work', focusId);
  } else {
    const version = centerRow as VersionRow;
    const [tracks, credits] = await Promise.all([
      database.getAllAsync<{ trackId: string }>(
        'SELECT id AS trackId FROM Tracks WHERE versionId = ? ORDER BY title COLLATE NOCASE ASC',
        [focusId],
      ),
      getCreditsForGraphTarget(database, 'version', focusId),
    ]);
    if (version.workId) {
      addEdge(`work-version:${version.workId}:${version.id}`, version.workId, 'work', version.id, 'version', 'work-version', 'اثر نسخه');
    }
    tracks.forEach((track) => {
      addEdge(`track-version:${track.trackId}:${focusId}`, track.trackId, 'track', focusId, 'version', 'track-version', 'نسخه');
    });
    addCreditEdges(addEdge, credits, focusId, 'version', focusId);
  }

  const nodes = new Map<string, MusicGraphNode>();
  await loadNeighborhoodNodes(database, required, nodes);
  return {
    nodes: [...nodes.values()],
    edges: edges.map(({ fromType: _fromType, toType: _toType, ...edge }) => edge),
  };
}

function artistRelationshipEdgeId(firstArtistId: string, secondArtistId: string): string {
  return `artist-artist:${[firstArtistId, secondArtistId].sort().join(':')}`;
}

async function resolveNodeType(
  database: MusicGraphDatabase,
  id: string,
): Promise<MusicGraphNodeType | null> {
  const matches = await Promise.all([
    database.getFirstAsync<{ id: string }>('SELECT id FROM Artists WHERE id = ?', [id]),
    database.getFirstAsync<{ id: string }>('SELECT id FROM Albums WHERE id = ?', [id]),
    database.getFirstAsync<{ id: string }>('SELECT id FROM Tracks WHERE id = ?', [id]),
    database.getFirstAsync<{ id: string }>('SELECT id FROM Works WHERE id = ?', [id]),
    database.getFirstAsync<{ id: string }>('SELECT id FROM Versions WHERE id = ?', [id]),
  ]);
  const types: MusicGraphNodeType[] = ['artist', 'album', 'track', 'work', 'version'];
  return types.find((_type, index) => Boolean(matches[index])) ?? null;
}

async function getNeighborhoodCenter(
  database: MusicGraphDatabase,
  type: MusicGraphNodeType,
  id: string,
): Promise<ArtistRow | AlbumRow | TrackRow | WorkRow | VersionRow | null> {
  if (type === 'artist') {
    return database.getFirstAsync<ArtistRow>(
      'SELECT id, name, type, profileImage, image FROM Artists WHERE id = ?',
      [id],
    );
  }
  if (type === 'album') {
    return database.getFirstAsync<AlbumRow>(
      'SELECT id, title, releaseYear, coverImage FROM Albums WHERE id = ?',
      [id],
    );
  }
  if (type === 'track') {
    return database.getFirstAsync<TrackRow>(
      'SELECT id, title, duration, audioUri, artistId, albumId, coverImage, lyrics, sheetMusicUri, versionName, workId, versionId FROM Tracks WHERE id = ?',
      [id],
    );
  }
  if (type === 'work') {
    return database.getFirstAsync<WorkRow>(
      'SELECT id, title, genre FROM Works WHERE id = ?',
      [id],
    );
  }
  return database.getFirstAsync<VersionRow>(
    'SELECT id, name, kind, workId FROM Versions WHERE id = ?',
    [id],
  );
}

async function getAlbumTrackLinks(
  database: MusicGraphDatabase,
  albumId: string,
): Promise<AlbumTrackLink[]> {
  return database.getAllAsync<AlbumTrackLink>(
    `SELECT albumId, trackId, discNumber, trackNumber
       FROM AlbumTracks
      WHERE albumId = ?
      ORDER BY CASE WHEN discNumber IS NULL OR trackNumber IS NULL THEN 1 ELSE 0 END,
               discNumber, trackNumber, trackId`,
    [albumId],
  );
}

async function getCreditsForGraphTarget(
  database: MusicGraphDatabase,
  type: MusicGraphNodeType,
  id: string,
): Promise<CreditRow[]> {
  const column = type === 'artist' ? 'artistId' : type === 'work' ? 'workId' : type === 'track' ? 'trackId' : 'albumId';
  return database.getAllAsync<CreditRow>(
    `SELECT Credits.id, Credits.artistId, Credits.workId, Credits.trackId, Credits.albumId,
            Roles.name AS roleName
       FROM Credits
       INNER JOIN Roles ON Roles.id = Credits.roleId
      WHERE Credits.${column} = ?
      ORDER BY Roles.name COLLATE NOCASE ASC, Credits.createdAt ASC`,
    [id],
  );
}

function addCreditEdges(
  addEdge: (
    id: string,
    from: string,
    fromType: MusicGraphNodeType,
    to: string,
    toType: MusicGraphNodeType,
    type: MusicGraphEdgeType,
    label: string | null,
  ) => void,
  credits: CreditRow[],
  focusId: string,
  focusType: MusicGraphNodeType,
  targetId: string,
) {
  credits.forEach((credit) => {
    const creditTarget = credit.workId
      ? { id: credit.workId, type: 'work' as const }
      : credit.trackId
        ? { id: credit.trackId, type: 'track' as const }
        : credit.albumId
          ? { id: credit.albumId, type: 'album' as const }
          : null;
    if (!creditTarget) return;
    if (focusType === 'artist') {
      addEdge(`credit:${credit.id}`, focusId, focusType, creditTarget.id, creditTarget.type, 'credit', credit.roleName);
    } else {
      addEdge(`credit:${credit.id}`, credit.artistId, 'artist', targetId, focusType, 'credit', credit.roleName);
    }
  });
}

async function loadNeighborhoodNodes(
  database: MusicGraphDatabase,
  required: Map<MusicGraphNodeType, Set<string>>,
  target: Map<string, MusicGraphNode>,
) {
  await Promise.all([...required.entries()].map(async ([type, ids]) => {
    const values = [...ids];
    if (!values.length) return;
    const placeholders = values.map(() => '?').join(', ');
    if (type === 'artist') {
      const rows = await database.getAllAsync<ArtistRow>(
        `SELECT id, name, type, profileImage, image FROM Artists WHERE id IN (${placeholders})`,
        values,
      );
      rows.forEach((artist) => target.set(`artist:${artist.id}`, {
        id: artist.id,
        type: 'artist',
        label: artist.name,
        subtitle: artist.type,
        imageUri: artist.profileImage ?? artist.image,
      }));
    } else if (type === 'album') {
      const rows = await database.getAllAsync<AlbumRow>(
        `SELECT id, title, releaseYear, coverImage FROM Albums WHERE id IN (${placeholders})`,
        values,
      );
      rows.forEach((album) => target.set(`album:${album.id}`, {
        id: album.id,
        type: 'album',
        label: album.title,
        subtitle: album.releaseYear ? `سال ${album.releaseYear}` : 'آلبوم',
        imageUri: album.coverImage,
      }));
    } else if (type === 'track') {
      const rows = await database.getAllAsync<TrackRow>(
        `SELECT id, title, duration, audioUri, artistId, albumId, coverImage, lyrics, sheetMusicUri, versionName, workId, versionId
           FROM Tracks
          WHERE id IN (${placeholders})`,
        values,
      );
      const artists = await database.getAllAsync<{ id: string; name: string }>(
        `SELECT id, name FROM Artists WHERE id IN (
           SELECT artistId FROM Tracks WHERE id IN (${placeholders}) AND artistId IS NOT NULL
         )`,
        values,
      );
      const artistNames = new Map(artists.map((artist) => [artist.id, artist.name]));
      rows.forEach((track) => target.set(`track:${track.id}`, {
        id: track.id,
        type: 'track',
        label: track.title,
        subtitle: track.artistId ? 'قطعه' : 'قطعه‌ی مستقل',
        imageUri: track.coverImage,
        durationSeconds: track.duration,
        audioUri: track.audioUri,
        artistName: track.artistId ? artistNames.get(track.artistId) ?? null : null,
        coverImage: track.coverImage,
        lyrics: track.lyrics,
        sheetMusicUri: track.sheetMusicUri,
        versionName: track.versionName,
        workId: track.workId,
        versionId: track.versionId,
        albumId: track.albumId,
      }));
    } else if (type === 'work') {
      const rows = await database.getAllAsync<WorkRow>(
        `SELECT id, title, genre FROM Works WHERE id IN (${placeholders})`,
        values,
      );
      rows.forEach((work) => target.set(`work:${work.id}`, {
        id: work.id,
        type: 'work',
        label: work.title,
        subtitle: work.genre ?? 'اثر',
        imageUri: null,
      }));
    } else {
      const rows = await database.getAllAsync<VersionRow & { workId: string }>(
        `SELECT id, name, kind, workId FROM Versions WHERE id IN (${placeholders})`,
        values,
      );
      rows.forEach((version) => target.set(`version:${version.id}`, {
        id: version.id,
        type: 'version',
        label: version.name,
        subtitle: version.kind ?? 'نسخه',
        imageUri: null,
      }));
    }
  }));
}