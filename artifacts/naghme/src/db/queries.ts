import { getDatabase } from '@/src/db/database';

export interface ArtistRecord {
  id: string;
  name: string;
  type: string | null;
  biography: string | null;
  genres: string | null;
  image: string | null;
}

export interface AlbumRecord {
  id: string;
  title: string;
  releaseYear: number | null;
  coverImage: string | null;
}

export interface TrackRecord {
  id: string;
  title: string;
  duration: number | null;
  artistId: string | null;
  albumId: string | null;
  audioUri: string | null;
  coverImage: string | null;
  lyrics: string | null;
  sheetMusicUri: string | null;
  versionName: string | null;
}

export interface PersonalRelationshipRecord {
  trackId: string;
  rating: number | null;
  favorite: boolean;
  emotionalTags: string | null;
  personalNote: string | null;
  listeningCount: number;
}

export interface JournalEntryRecord {
  id: string;
  trackId: string;
  note: string;
  mood: string;
  createdAt: string;
}

export interface ListeningHistoryRecord {
  id: string;
  trackId: string;
  listenedAt: string;
}

export interface LibraryStats {
  tracks: number;
  albums: number;
  artists: number;
}

export interface HomeTrackRecord extends TrackRecord {
  albumTitle: string | null;
}

export interface MusicGraphRow {
  artistId: string | null;
  artistName: string | null;
  albumId: string | null;
  albumTitle: string | null;
  albumReleaseYear: number | null;
  albumCoverImage: string | null;
  trackId: string;
  trackTitle: string;
  trackDuration: number | null;
  trackArtistId: string | null;
  trackAlbumId: string | null;
  trackAudioUri: string | null;
  trackCoverImage: string | null;
  trackLyrics: string | null;
  trackSheetMusicUri: string | null;
  trackVersionName: string | null;
}

export interface RecommendationTrack extends TrackRecord {
  artistName: string | null;
  albumTitle: string | null;
  listeningCount: number;
  lastListenedAt: string | null;
  recentMoods: string | null;
  favorite: boolean;
  rating: number | null;
  personalNote: string | null;
}

export type SearchResultType = 'track' | 'album' | 'artist';
export type SearchFilter = 'all' | 'track' | 'artist' | 'album' | 'lyrics' | 'journal';
export type SearchMatchSource = 'title' | 'lyrics' | 'journal';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  type: SearchResultType;
  matchSource: SearchMatchSource;
}

export type NewArtist = Omit<ArtistRecord, 'id'>;
export type NewAlbum = Omit<AlbumRecord, 'id'>;
export type NewTrack = Omit<
  TrackRecord,
  'id' | 'lyrics' | 'sheetMusicUri' | 'versionName'
> & Partial<Pick<TrackRecord, 'lyrics' | 'sheetMusicUri' | 'versionName'>>;
export type UpdateArtist = Partial<NewArtist>;
export type UpdateAlbum = Partial<NewAlbum>;
export type UpdateTrack = Partial<NewTrack>;

export type NewJournalEntry = Pick<JournalEntryRecord, 'trackId' | 'note' | 'mood'>;
export type UpdateJournalEntry = Pick<JournalEntryRecord, 'note' | 'mood'>;

export type PersonalRelationshipInput = Omit<
  PersonalRelationshipRecord,
  'emotionalTags' | 'personalNote' | 'listeningCount'
> & {
  emotionalTags?: string | null;
  personalNote?: string | null;
  listeningCount?: number;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

async function requireDatabase() {
  const database = await getDatabase();
  if (!database) {
    throw new Error('ذخیره‌سازی SQLite در این محیط در دسترس نیست.');
  }
  return database;
}

const TRACK_COLUMNS =
  'id, title, duration, artistId, albumId, audioUri, coverImage, lyrics, sheetMusicUri, versionName';

export async function addArtist(input: NewArtist): Promise<ArtistRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('نام هنرمند الزامی است.');
  }

  const artist: ArtistRecord = { ...input, id: createId('artist'), name };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO Artists (id, name, type, biography, genres, image)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      artist.id,
      artist.name,
      artist.type,
      artist.biography,
      artist.genres,
      artist.image,
    ],
  );
  return artist;
}

export async function getArtists(): Promise<ArtistRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<ArtistRecord>(
    'SELECT id, name, type, biography, genres, image FROM Artists ORDER BY name COLLATE NOCASE ASC',
    [],
  );
}

export async function getArtistById(id: string): Promise<ArtistRecord | null> {
  const database = await requireDatabase();
  return database.getFirstAsync<ArtistRecord>(
    'SELECT id, name, type, biography, genres, image FROM Artists WHERE id = ?',
    [id],
  );
}

export async function updateArtist(
  id: string,
  input: UpdateArtist,
): Promise<ArtistRecord> {
  const current = await getArtistById(id);
  if (!current) throw new Error('هنرمند پیدا نشد.');

  const artist = {
    ...current,
    ...input,
    name: input.name?.trim() || current.name,
  };
  if (!artist.name.trim()) throw new Error('نام هنرمند الزامی است.');

  const database = await requireDatabase();
  await database.runAsync(
    `UPDATE Artists
     SET name = ?, type = ?, biography = ?, genres = ?, image = ?
     WHERE id = ?`,
    [artist.name, artist.type, artist.biography, artist.genres, artist.image, id],
  );
  return artist;
}

export async function deleteArtist(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('UPDATE Tracks SET artistId = NULL WHERE artistId = ?', [id]);
  await database.runAsync('DELETE FROM Artists WHERE id = ?', [id]);
}

export async function addAlbum(input: NewAlbum): Promise<AlbumRecord> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('عنوان آلبوم الزامی است.');
  }

  const album: AlbumRecord = { ...input, id: createId('album'), title };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO Albums (id, title, releaseYear, coverImage)
     VALUES (?, ?, ?, ?)`,
    [album.id, album.title, album.releaseYear, album.coverImage],
  );
  return album;
}

export async function getAlbums(): Promise<AlbumRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<AlbumRecord>(
    'SELECT id, title, releaseYear, coverImage FROM Albums ORDER BY title COLLATE NOCASE ASC',
    [],
  );
}

export async function getAlbumById(id: string): Promise<AlbumRecord | null> {
  const database = await requireDatabase();
  return database.getFirstAsync<AlbumRecord>(
    'SELECT id, title, releaseYear, coverImage FROM Albums WHERE id = ?',
    [id],
  );
}

export async function updateAlbum(
  id: string,
  input: UpdateAlbum,
): Promise<AlbumRecord> {
  const current = await getAlbumById(id);
  if (!current) throw new Error('آلبوم پیدا نشد.');

  const album = {
    ...current,
    ...input,
    title: input.title?.trim() || current.title,
  };
  if (!album.title.trim()) throw new Error('عنوان آلبوم الزامی است.');

  const database = await requireDatabase();
  await database.runAsync(
    `UPDATE Albums SET title = ?, releaseYear = ?, coverImage = ? WHERE id = ?`,
    [album.title, album.releaseYear, album.coverImage, id],
  );
  return album;
}

export async function deleteAlbum(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM Albums WHERE id = ?', [id]);
}

export async function addTrack(input: NewTrack): Promise<TrackRecord> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('عنوان قطعه الزامی است.');
  }

  const track: TrackRecord = {
    ...input,
    id: createId('track'),
    title,
    lyrics: input.lyrics ?? null,
    sheetMusicUri: input.sheetMusicUri ?? null,
    versionName: input.versionName ?? null,
  };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO Tracks
       (id, title, duration, artistId, albumId, audioUri, coverImage, lyrics, sheetMusicUri, versionName)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      track.id,
      track.title,
      track.duration,
      track.artistId,
      track.albumId,
      track.audioUri,
      track.coverImage,
      track.lyrics,
      track.sheetMusicUri,
      track.versionName,
    ],
  );
  return track;
}

export async function getTracks(): Promise<TrackRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<TrackRecord>(
    `SELECT ${TRACK_COLUMNS} FROM Tracks ORDER BY title COLLATE NOCASE ASC`,
    [],
  );
}

export async function getLibraryStats(): Promise<LibraryStats> {
  const database = await requireDatabase();
  const row = await database.getFirstAsync<LibraryStats>(
    `SELECT
       (SELECT COUNT(*) FROM Tracks) AS tracks,
       (SELECT COUNT(*) FROM Albums) AS albums,
       (SELECT COUNT(*) FROM Artists) AS artists`,
    [],
  );
  return row ?? { tracks: 0, albums: 0, artists: 0 };
}

export async function getRecentlyAddedTracks(limit = 6): Promise<HomeTrackRecord[]> {
  const database = await requireDatabase();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 20));
  return database.getAllAsync<HomeTrackRecord>(
    `SELECT
       Tracks.id, Tracks.title, Tracks.duration, Tracks.artistId, Tracks.albumId,
       Tracks.audioUri, Tracks.coverImage, Tracks.lyrics, Tracks.sheetMusicUri,
       Tracks.versionName, Albums.title AS albumTitle
     FROM Tracks
     LEFT JOIN Albums ON Albums.id = Tracks.albumId
     ORDER BY Tracks.rowid DESC
     LIMIT ?`,
    [safeLimit],
  );
}

export async function getTracksByArtistId(artistId: string): Promise<TrackRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<TrackRecord>(
    `SELECT ${TRACK_COLUMNS}
     FROM Tracks
     WHERE artistId = ?
     ORDER BY title COLLATE NOCASE ASC`,
    [artistId],
  );
}

export async function getTracksByAlbumId(albumId: string): Promise<TrackRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<TrackRecord>(
    `SELECT ${TRACK_COLUMNS}
     FROM Tracks
     WHERE albumId = ?
     ORDER BY title COLLATE NOCASE ASC`,
    [albumId],
  );
}

export async function getMusicGraphRows(): Promise<MusicGraphRow[]> {
  const database = await requireDatabase();
  return database.getAllAsync<MusicGraphRow>(
    `SELECT
       Artists.id AS artistId,
       Artists.name AS artistName,
       Albums.id AS albumId,
       Albums.title AS albumTitle,
       Albums.releaseYear AS albumReleaseYear,
       Albums.coverImage AS albumCoverImage,
       Tracks.id AS trackId,
       Tracks.title AS trackTitle,
       Tracks.duration AS trackDuration,
       Tracks.artistId AS trackArtistId,
       Tracks.albumId AS trackAlbumId,
       Tracks.audioUri AS trackAudioUri,
       Tracks.coverImage AS trackCoverImage,
       Tracks.lyrics AS trackLyrics,
       Tracks.sheetMusicUri AS trackSheetMusicUri,
       Tracks.versionName AS trackVersionName
     FROM Tracks
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
     LEFT JOIN Albums ON Albums.id = Tracks.albumId
     ORDER BY
       COALESCE(Artists.name, '') COLLATE NOCASE ASC,
       COALESCE(Albums.title, '') COLLATE NOCASE ASC,
       Tracks.title COLLATE NOCASE ASC`,
    [],
  );
}

export async function getFavoriteTracks(limit = 6): Promise<HomeTrackRecord[]> {
  const database = await requireDatabase();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 20));
  return database.getAllAsync<HomeTrackRecord>(
    `SELECT
       Tracks.id, Tracks.title, Tracks.duration, Tracks.artistId, Tracks.albumId,
       Tracks.audioUri, Tracks.coverImage, Tracks.lyrics, Tracks.sheetMusicUri,
       Tracks.versionName, Albums.title AS albumTitle
     FROM Tracks
     INNER JOIN PersonalRelationships
       ON PersonalRelationships.trackId = Tracks.id
     LEFT JOIN Albums ON Albums.id = Tracks.albumId
     WHERE PersonalRelationships.favorite = 1
     ORDER BY Tracks.rowid DESC
     LIMIT ?`,
    [safeLimit],
  );
}

export async function searchLibrary(query: string, limit = 60): Promise<SearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  return searchLibraryByFilter(normalizedQuery, 'all', limit);
}

export async function searchLibraryByFilter(
  query: string,
  filter: SearchFilter = 'all',
  limit = 60,
): Promise<SearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const database = await requireDatabase();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const pattern = `%${normalizedQuery}%`;

  if (filter === 'artist') {
    return database.getAllAsync<SearchResult>(
      `SELECT id, name AS title, type AS subtitle, 'artist' AS type, 'title' AS matchSource
       FROM Artists
       WHERE name LIKE ? COLLATE NOCASE
       ORDER BY name COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, safeLimit],
    );
  }

  if (filter === 'album') {
    return database.getAllAsync<SearchResult>(
      `SELECT id, title, CAST(releaseYear AS TEXT) AS subtitle, 'album' AS type, 'title' AS matchSource
       FROM Albums
       WHERE title LIKE ? COLLATE NOCASE
       ORDER BY title COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, safeLimit],
    );
  }

  if (filter === 'track') {
    return database.getAllAsync<SearchResult>(
      `SELECT id, title, NULL AS subtitle, 'track' AS type, 'title' AS matchSource
       FROM Tracks
       WHERE title LIKE ? COLLATE NOCASE
       ORDER BY title COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, safeLimit],
    );
  }

  if (filter === 'lyrics') {
    return database.getAllAsync<SearchResult>(
      `SELECT id, title,
          'متن ترانه: ' || substr(replace(lyrics, char(10), ' '), 1, 90) AS subtitle,
          'track' AS type, 'lyrics' AS matchSource
       FROM Tracks
       WHERE lyrics IS NOT NULL AND lyrics LIKE ? COLLATE NOCASE
       ORDER BY title COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, safeLimit],
    );
  }

  if (filter === 'journal') {
    return database.getAllAsync<SearchResult>(
      `SELECT
         Tracks.id,
         Tracks.title,
         'دفترچه: ' || COALESCE(JournalEntries.mood, '') || ' • ' ||
           substr(replace(JournalEntries.note, char(10), ' '), 1, 80) AS subtitle,
         'track' AS type,
         'journal' AS matchSource
       FROM Tracks
       INNER JOIN JournalEntries ON JournalEntries.trackId = Tracks.id
       WHERE (
         JournalEntries.note LIKE ? COLLATE NOCASE OR
         JournalEntries.mood LIKE ? COLLATE NOCASE
       )
       GROUP BY Tracks.id
       ORDER BY MAX(datetime(JournalEntries.createdAt)) DESC
       LIMIT ?`,
      [pattern, pattern, safeLimit],
    );
  }

  const [trackResults, albumResults, artistResults, journalResults] = await Promise.all([
    database.getAllAsync<SearchResult>(
      `SELECT
         Tracks.id,
         Tracks.title,
         CASE
           WHEN Tracks.title LIKE ? COLLATE NOCASE THEN Albums.title
           ELSE 'متن ترانه: ' || substr(replace(COALESCE(Tracks.lyrics, ''), char(10), ' '), 1, 90)
         END AS subtitle,
         'track' AS type,
         CASE
           WHEN Tracks.title LIKE ? COLLATE NOCASE THEN 'title'
           ELSE 'lyrics'
         END AS matchSource
       FROM Tracks
       LEFT JOIN Albums ON Albums.id = Tracks.albumId
       WHERE Tracks.title LIKE ? COLLATE NOCASE
          OR COALESCE(Tracks.lyrics, '') LIKE ? COLLATE NOCASE
       ORDER BY Tracks.title COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, pattern, pattern, pattern, safeLimit],
    ),
    database.getAllAsync<SearchResult>(
      `SELECT id, title, CAST(releaseYear AS TEXT) AS subtitle,
         'album' AS type, 'title' AS matchSource
       FROM Albums
       WHERE title LIKE ? COLLATE NOCASE
       ORDER BY title COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, safeLimit],
    ),
    database.getAllAsync<SearchResult>(
      `SELECT id, name AS title, type AS subtitle,
         'artist' AS type, 'title' AS matchSource
       FROM Artists
       WHERE name LIKE ? COLLATE NOCASE
       ORDER BY name COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, safeLimit],
    ),
    database.getAllAsync<SearchResult>(
      `SELECT
         JournalEntries.trackId AS id,
         Tracks.title,
         'دفترچه: ' || COALESCE(JournalEntries.mood, '') || ' • ' ||
           substr(replace(COALESCE(JournalEntries.note, ''), char(10), ' '), 1, 80) AS subtitle,
         'track' AS type,
         'journal' AS matchSource
       FROM JournalEntries
       INNER JOIN Tracks ON Tracks.id = JournalEntries.trackId
       WHERE JournalEntries.note LIKE ? COLLATE NOCASE
          OR JournalEntries.mood LIKE ? COLLATE NOCASE
       ORDER BY datetime(JournalEntries.createdAt) DESC
       LIMIT ?`,
      [pattern, pattern, safeLimit],
    ),
  ]);

  const seen = new Set<string>();
  return [...trackResults, ...albumResults, ...artistResults, ...journalResults]
    .filter((result) => {
      const key = `${result.type}:${result.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.title.localeCompare(right.title, 'fa'))
    .slice(0, safeLimit);
}

export async function getTrackById(id: string): Promise<TrackRecord | null> {
  const database = await requireDatabase();
  return database.getFirstAsync<TrackRecord>(
    `SELECT ${TRACK_COLUMNS} FROM Tracks WHERE id = ?`,
    [id],
  );
}

export async function updateTrack(
  id: string,
  input: UpdateTrack,
): Promise<TrackRecord> {
  const current = await getTrackById(id);
  if (!current) throw new Error('قطعه پیدا نشد.');

  const track = {
    ...current,
    ...input,
    title: input.title?.trim() || current.title,
  };
  if (!track.title.trim()) throw new Error('عنوان قطعه الزامی است.');

  const database = await requireDatabase();
  await database.runAsync(
    `UPDATE Tracks
      SET title = ?, duration = ?, artistId = ?, albumId = ?, audioUri = ?, coverImage = ?,
          lyrics = ?, sheetMusicUri = ?, versionName = ?
     WHERE id = ?`,
    [
      track.title,
      track.duration,
      track.artistId,
      track.albumId,
      track.audioUri,
      track.coverImage,
      track.lyrics,
      track.sheetMusicUri,
      track.versionName,
      id,
    ],
  );
  return track;
}

export async function deleteTrack(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM Tracks WHERE id = ?', [id]);
}

export async function getRecommendationTracks(): Promise<RecommendationTrack[]> {
  const database = await requireDatabase();
  const rows = await database.getAllAsync<
    Omit<RecommendationTrack, 'favorite'> & { favorite: number }
  >(
    `SELECT
       Tracks.id,
       Tracks.title,
       Tracks.duration,
       Tracks.artistId,
       Tracks.albumId,
       Tracks.audioUri,
       Tracks.coverImage,
       Tracks.lyrics,
       Tracks.sheetMusicUri,
       Tracks.versionName,
       Artists.name AS artistName,
       Albums.title AS albumTitle,
       COALESCE(PersonalRelationships.listeningCount, 0) AS listeningCount,
       PersonalRelationships.rating,
       PersonalRelationships.personalNote,
       PersonalRelationships.favorite,
       (
         SELECT MAX(ListeningHistory.listenedAt)
         FROM ListeningHistory
         WHERE ListeningHistory.trackId = Tracks.id
       ) AS lastListenedAt,
       (
         SELECT GROUP_CONCAT(mood, '، ')
         FROM (
           SELECT mood
           FROM JournalEntries
           WHERE JournalEntries.trackId = Tracks.id
           ORDER BY datetime(createdAt) DESC
           LIMIT 5
         )
       ) AS recentMoods
     FROM Tracks
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
     LEFT JOIN Albums ON Albums.id = Tracks.albumId
     LEFT JOIN PersonalRelationships
       ON PersonalRelationships.trackId = Tracks.id
     ORDER BY Tracks.title COLLATE NOCASE ASC`,
    [],
  );
  return rows.map((row) => ({ ...row, favorite: Boolean(row.favorite) }));
}

function mapRelationship(
  row: Omit<PersonalRelationshipRecord, 'favorite'> & { favorite: number },
): PersonalRelationshipRecord {
  return { ...row, favorite: Boolean(row.favorite) };
}

export async function getPersonalRelationship(
  trackId: string,
): Promise<PersonalRelationshipRecord | null> {
  const database = await requireDatabase();
  const row = await database.getFirstAsync<
    Omit<PersonalRelationshipRecord, 'favorite'> & { favorite: number }
  >(
    `SELECT trackId, rating, favorite, emotionalTags, personalNote, listeningCount
     FROM PersonalRelationships WHERE trackId = ?`,
    [trackId],
  );
  return row ? mapRelationship(row) : null;
}

export async function upsertPersonalRelationship(
  input: PersonalRelationshipInput,
): Promise<PersonalRelationshipRecord> {
  if (input.rating !== null && (input.rating < 1 || input.rating > 5)) {
    throw new Error('امتیاز باید بین ۱ تا ۵ باشد.');
  }

  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO PersonalRelationships
       (trackId, rating, favorite, emotionalTags, personalNote, listeningCount)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(trackId) DO UPDATE SET
       rating = excluded.rating,
       favorite = excluded.favorite,
       emotionalTags = excluded.emotionalTags,
       personalNote = excluded.personalNote,
       listeningCount = excluded.listeningCount`,
    [
      input.trackId,
      input.rating,
      input.favorite ? 1 : 0,
      input.emotionalTags ?? null,
      input.personalNote ?? null,
      input.listeningCount ?? 0,
    ],
  );

  const saved = await getPersonalRelationship(input.trackId);
  if (!saved) throw new Error('رابطه‌ی شخصی ذخیره نشد.');
  return saved;
}

export async function addJournalEntry(input: NewJournalEntry): Promise<JournalEntryRecord> {
  const note = input.note.trim();
  const mood = input.mood.trim();
  if (!mood) throw new Error('انتخاب حال الزامی است.');
  if (!note) throw new Error('یادداشت حال خود را بنویس.');

  const entry: JournalEntryRecord = {
    id: createId('journal'),
    trackId: input.trackId,
    note,
    mood,
    createdAt: new Date().toISOString(),
  };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO JournalEntries (id, trackId, note, mood, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [entry.id, entry.trackId, entry.note, entry.mood, entry.createdAt],
  );
  return entry;
}

export async function getJournalEntries(trackId: string): Promise<JournalEntryRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<JournalEntryRecord>(
    `SELECT id, trackId, note, mood, createdAt
     FROM JournalEntries
     WHERE trackId = ?
     ORDER BY datetime(createdAt) DESC`,
    [trackId],
  );
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM JournalEntries WHERE id = ?', [id]);
}

export async function updateJournalEntry(
  id: string,
  input: UpdateJournalEntry,
): Promise<JournalEntryRecord> {
  const note = input.note.trim();
  const mood = input.mood.trim();
  if (!mood) throw new Error('انتخاب حال الزامی است.');
  if (!note) throw new Error('یادداشت حال خود را بنویس.');

  const database = await requireDatabase();
  await database.runAsync(
    `UPDATE JournalEntries
     SET note = ?, mood = ?
     WHERE id = ?`,
    [note, mood, id],
  );
  const updated = await database.getFirstAsync<JournalEntryRecord>(
    `SELECT id, trackId, note, mood, createdAt
     FROM JournalEntries
     WHERE id = ?`,
    [id],
  );
  if (!updated) throw new Error('یادداشت ویرایش نشد.');
  return updated;
}

export async function logListen(trackId: string): Promise<ListeningHistoryRecord> {
  const historyEntry: ListeningHistoryRecord = {
    id: createId('listen'),
    trackId,
    listenedAt: new Date().toISOString(),
  };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO ListeningHistory (id, trackId, listenedAt)
     VALUES (?, ?, ?)`,
    [historyEntry.id, historyEntry.trackId, historyEntry.listenedAt],
  );
  return historyEntry;
}

export async function getListeningHistory(trackId: string): Promise<ListeningHistoryRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<ListeningHistoryRecord>(
    `SELECT id, trackId, listenedAt
     FROM ListeningHistory
     WHERE trackId = ?
     ORDER BY datetime(listenedAt) DESC`,
    [trackId],
  );
}