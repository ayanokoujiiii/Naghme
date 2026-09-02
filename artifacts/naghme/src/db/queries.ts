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

export type NewArtist = Omit<ArtistRecord, 'id'>;
export type NewAlbum = Omit<AlbumRecord, 'id'>;
export type NewTrack = Omit<TrackRecord, 'id'>;

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