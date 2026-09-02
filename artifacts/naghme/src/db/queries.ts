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
  albumId: string | null;
  audioUri: string | null;
  coverImage: string | null;
}

export interface PersonalRelationshipRecord {
  trackId: string;
  rating: number | null;
  favorite: boolean;
  emotionalTags: string | null;
  personalNote: string | null;
  listeningCount: number;
}

export interface LibraryStats {
  tracks: number;
  albums: number;
  artists: number;
}

export interface HomeTrackRecord extends TrackRecord {
  albumTitle: string | null;
}

export type SearchResultType = 'track' | 'album' | 'artist';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  type: SearchResultType;
}

export type NewArtist = Omit<ArtistRecord, 'id'>;
export type NewAlbum = Omit<AlbumRecord, 'id'>;
export type NewTrack = Omit<TrackRecord, 'id'>;
export type UpdateArtist = Partial<NewArtist>;
export type UpdateAlbum = Partial<NewAlbum>;
export type UpdateTrack = Partial<NewTrack>;

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

  const track: TrackRecord = { ...input, id: createId('track'), title };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO Tracks (id, title, duration, albumId, audioUri, coverImage)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      track.id,
      track.title,
      track.duration,
      track.albumId,
      track.audioUri,
      track.coverImage,
    ],
  );
  return track;
}

export async function getTracks(): Promise<TrackRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<TrackRecord>(
    'SELECT id, title, duration, albumId, audioUri, coverImage FROM Tracks ORDER BY title COLLATE NOCASE ASC',
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
       Tracks.id, Tracks.title, Tracks.duration, Tracks.albumId,
       Tracks.audioUri, Tracks.coverImage, Albums.title AS albumTitle
     FROM Tracks
     LEFT JOIN Albums ON Albums.id = Tracks.albumId
     ORDER BY Tracks.rowid DESC
     LIMIT ?`,
    [safeLimit],
  );
}

export async function getFavoriteTracks(limit = 6): Promise<HomeTrackRecord[]> {
  const database = await requireDatabase();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 20));
  return database.getAllAsync<HomeTrackRecord>(
    `SELECT
       Tracks.id, Tracks.title, Tracks.duration, Tracks.albumId,
       Tracks.audioUri, Tracks.coverImage, Albums.title AS albumTitle
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

  const database = await requireDatabase();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const pattern = `%${normalizedQuery}%`;
  return database.getAllAsync<SearchResult>(
    `SELECT id, title, subtitle, type
     FROM (
       SELECT Tracks.id, Tracks.title, Albums.title AS subtitle, 'track' AS type
       FROM Tracks
       LEFT JOIN Albums ON Albums.id = Tracks.albumId
       WHERE Tracks.title LIKE ? COLLATE NOCASE
       UNION ALL
       SELECT Albums.id, Albums.title, CAST(Albums.releaseYear AS TEXT), 'album' AS type
       FROM Albums
       WHERE Albums.title LIKE ? COLLATE NOCASE
       UNION ALL
       SELECT Artists.id, Artists.name, Artists.type, 'artist' AS type
       FROM Artists
       WHERE Artists.name LIKE ? COLLATE NOCASE
     )
     ORDER BY title COLLATE NOCASE ASC
     LIMIT ?`,
    [pattern, pattern, pattern, safeLimit],
  );
}

export async function getTrackById(id: string): Promise<TrackRecord | null> {
  const database = await requireDatabase();
  return database.getFirstAsync<TrackRecord>(
    'SELECT id, title, duration, albumId, audioUri, coverImage FROM Tracks WHERE id = ?',
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
     SET title = ?, duration = ?, albumId = ?, audioUri = ?, coverImage = ?
     WHERE id = ?`,
    [
      track.title,
      track.duration,
      track.albumId,
      track.audioUri,
      track.coverImage,
      id,
    ],
  );
  return track;
}

export async function deleteTrack(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM Tracks WHERE id = ?', [id]);
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