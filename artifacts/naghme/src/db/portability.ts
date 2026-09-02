import { getDatabase } from '@/src/db/database';
import type {
  AlbumRecord,
  ArtistRecord,
  PersonalRelationshipRecord,
  TrackRecord,
} from '@/src/db/queries';

export interface ArchiveBackup {
  format: 'naghme-archive';
  version: 1;
  exportedAt: string;
  artists: ArtistRecord[];
  albums: AlbumRecord[];
  tracks: TrackRecord[];
  personalRelationships: PersonalRelationshipRecord[];
}

export interface RestoreSummary {
  artists: number;
  albums: number;
  tracks: number;
  personalRelationships: number;
}

async function requireDatabase() {
  const database = await getDatabase();
  if (!database) {
    throw new Error('خروجی گرفتن از آرشیو روی پیش‌نمایش وب در دسترس نیست؛ برنامه را در Android باز کنید.');
  }
  return database;
}

export async function createArchiveBackup(): Promise<string> {
  const database = await requireDatabase();
  const [artists, albums, tracks, personalRelationships] = await Promise.all([
    database.getAllAsync<ArtistRecord>('SELECT * FROM Artists ORDER BY rowid ASC', []),
    database.getAllAsync<AlbumRecord>('SELECT * FROM Albums ORDER BY rowid ASC', []),
    database.getAllAsync<TrackRecord>('SELECT * FROM Tracks ORDER BY rowid ASC', []),
    database.getAllAsync<PersonalRelationshipRecord>(
      'SELECT * FROM PersonalRelationships ORDER BY rowid ASC',
      [],
    ),
  ]);

  const backup: ArchiveBackup = {
    format: 'naghme-archive',
    version: 1,
    exportedAt: new Date().toISOString(),
    artists,
    albums,
    tracks,
    personalRelationships,
  };

  return JSON.stringify(backup, null, 2);
}

export async function restoreArchiveBackup(json: string): Promise<RestoreSummary> {
  const database = await requireDatabase();
  const backup = parseBackup(json);
  const albumIds = new Set(backup.albums.map((album) => album.id));
  const trackIds = new Set(backup.tracks.map((track) => track.id));

  for (const track of backup.tracks) {
    if (track.albumId && !albumIds.has(track.albumId)) {
      throw new Error(`آلبوم مرتبط با قطعه‌ی «${track.title}» در فایل پیدا نشد.`);
    }
  }
  for (const relationship of backup.personalRelationships) {
    if (!trackIds.has(relationship.trackId)) {
      throw new Error('یکی از رابطه‌های شخصی به قطعه‌ای نامعتبر اشاره می‌کند.');
    }
  }

  await database.withTransactionAsync(async () => {
    for (const artist of backup.artists) {
      await database.runAsync(
        `INSERT INTO Artists (id, name, type, biography, genres, image)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           type = excluded.type,
           biography = excluded.biography,
           genres = excluded.genres,
           image = excluded.image`,
        [artist.id, artist.name, artist.type, artist.biography, artist.genres, artist.image],
      );
    }

    for (const album of backup.albums) {
      await database.runAsync(
        `INSERT INTO Albums (id, title, releaseYear, coverImage)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           releaseYear = excluded.releaseYear,
           coverImage = excluded.coverImage`,
        [album.id, album.title, album.releaseYear, album.coverImage],
      );
    }

    for (const track of backup.tracks) {
      await database.runAsync(
        `INSERT INTO Tracks (id, title, duration, albumId, audioUri, coverImage)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           duration = excluded.duration,
           albumId = excluded.albumId,
           audioUri = excluded.audioUri,
           coverImage = excluded.coverImage`,
        [
          track.id,
          track.title,
          track.duration,
          track.albumId,
          track.audioUri,
          track.coverImage,
        ],
      );
    }

    for (const relationship of backup.personalRelationships) {
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
          relationship.trackId,
          relationship.rating,
          relationship.favorite ? 1 : 0,
          relationship.emotionalTags,
          relationship.personalNote,
          relationship.listeningCount,
        ],
      );
    }
  });

  return {
    artists: backup.artists.length,
    albums: backup.albums.length,
    tracks: backup.tracks.length,
    personalRelationships: backup.personalRelationships.length,
  };
}

function parseBackup(json: string): ArchiveBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('فایل انتخاب‌شده JSON معتبر نیست.');
  }

  if (!isRecord(parsed) || parsed.format !== 'naghme-archive' || parsed.version !== 1) {
    throw new Error('این فایل پشتیبان متعلق به نغمه نیست یا نسخه‌ی آن پشتیبانی نمی‌شود.');
  }

  const artists = parseArtists(parsed.artists);
  const albums = parseAlbums(parsed.albums);
  const tracks = parseTracks(parsed.tracks);
  const personalRelationships = parseRelationships(parsed.personalRelationships);

  return {
    format: 'naghme-archive',
    version: 1,
    exportedAt: requiredString(parsed.exportedAt, 'تاریخ خروجی'),
    artists,
    albums,
    tracks,
    personalRelationships,
  };
}

function parseArtists(value: unknown): ArtistRecord[] {
  return arrayValue(value, 'هنرمندان').map((item, index) => {
    const record = recordValue(item, `هنرمند شماره‌ی ${index + 1}`);
    return {
      id: requiredString(record.id, 'شناسه‌ی هنرمند'),
      name: requiredString(record.name, 'نام هنرمند'),
      type: nullableString(record.type, 'نوع هنرمند'),
      biography: nullableString(record.biography, 'زندگی‌نامه'),
      genres: nullableString(record.genres, 'سبک‌ها'),
      image: nullableString(record.image, 'تصویر هنرمند'),
    };
  });
}

function parseAlbums(value: unknown): AlbumRecord[] {
  return arrayValue(value, 'آلبوم‌ها').map((item, index) => {
    const record = recordValue(item, `آلبوم شماره‌ی ${index + 1}`);
    return {
      id: requiredString(record.id, 'شناسه‌ی آلبوم'),
      title: requiredString(record.title, 'عنوان آلبوم'),
      releaseYear: nullableInteger(record.releaseYear, 'سال انتشار'),
      coverImage: nullableString(record.coverImage, 'تصویر آلبوم'),
    };
  });
}

function parseTracks(value: unknown): TrackRecord[] {
  return arrayValue(value, 'قطعه‌ها').map((item, index) => {
    const record = recordValue(item, `قطعه‌ی شماره‌ی ${index + 1}`);
    return {
      id: requiredString(record.id, 'شناسه‌ی قطعه'),
      title: requiredString(record.title, 'عنوان قطعه'),
      duration: nullableInteger(record.duration, 'مدت‌زمان قطعه'),
      albumId: nullableString(record.albumId, 'شناسه‌ی آلبوم قطعه'),
      audioUri: nullableString(record.audioUri, 'مسیر فایل صوتی'),
      coverImage: nullableString(record.coverImage, 'تصویر قطعه'),
    };
  });
}

function parseRelationships(value: unknown): PersonalRelationshipRecord[] {
  return arrayValue(value, 'رابطه‌های شخصی').map((item, index) => {
    const record = recordValue(item, `رابطه‌ی شماره‌ی ${index + 1}`);
    const rating = nullableNumber(record.rating, 'امتیاز');
    if (rating !== null && (rating < 1 || rating > 5)) {
      throw new Error('امتیاز رابطه‌های شخصی باید بین ۱ تا ۵ باشد.');
    }
    return {
      trackId: requiredString(record.trackId, 'شناسه‌ی قطعه در رابطه'),
      rating,
      favorite: booleanValue(record.favorite, 'علاقه‌مندی'),
      emotionalTags: nullableString(record.emotionalTags, 'برچسب‌های احساسی'),
      personalNote: nullableString(record.personalNote, 'یادداشت شخصی'),
      listeningCount: nonNegativeInteger(record.listeningCount, 'تعداد شنیدن'),
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} ساختار معتبری ندارد.`);
  return value;
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`فهرست ${label} در فایل معتبر نیست.`);
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} باید یک متن غیرخالی باشد.`);
  }
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`${label} باید متن یا خالی باشد.`);
  return value;
}

function nullableInteger(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${label} باید یک عدد صحیح یا خالی باشد.`);
  }
  return value;
}

function nullableNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} باید یک عدد یا خالی باشد.`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  const parsed = nullableInteger(value, label);
  if (parsed === null || parsed < 0) throw new Error(`${label} باید صفر یا بیشتر باشد.`);
  return parsed;
}

function booleanValue(value: unknown, label: string): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;
  throw new Error(`${label} باید درست یا نادرست باشد.`);
}