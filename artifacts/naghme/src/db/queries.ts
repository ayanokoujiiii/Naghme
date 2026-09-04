import { getDatabase } from '@/src/db/database';
import { deleteAudioFile, migrateCachedAudioFiles } from '@/src/audio/audioFiles';

export interface ArtistRecord {
  id: string;
  name: string;
  type: string | null;
  biography: string | null;
  genres: string | null;
  image: string | null;
  profileImage: string | null;
  galleryImages: string | null;
}

export interface ArtistRelationshipRecord {
  id: string;
  artistId: string;
  relatedArtistId: string;
  relatedArtistName: string;
  relatedArtistType: string | null;
  description: string | null;
  createdAt: string;
}

export type ArtistAlbumLinkSource = 'explicit' | 'inferred';

export interface ArtistAlbumLinkRecord {
  artistId: string;
  albumId: string;
  source: ArtistAlbumLinkSource;
  artistName: string;
  albumTitle: string;
}

export interface AlbumRecord {
  id: string;
  title: string;
  releaseYear: number | null;
  coverImage: string | null;
}

export interface RoleRecord {
  id: string;
  name: string;
  key: string;
  description: string | null;
}

export interface CreditRecord {
  id: string;
  artistId: string;
  roleId: string;
  workId: string | null;
  trackId: string | null;
  albumId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditViewRecord extends CreditRecord {
  artistName: string;
  roleName: string;
  roleKey: string;
  workTitle: string | null;
  trackTitle: string | null;
  albumTitle: string | null;
}

export interface WorkRecord {
  id: string;
  title: string;
  alternateTitles: string | null;
  description: string | null;
  language: string | null;
  genre: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VersionRecord {
  id: string;
  workId: string;
  name: string;
  kind: string | null;
  description: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
  workId: string | null;
  versionId: string | null;
}

export type AlbumTrackOrderSource = 'explicit' | 'legacy' | 'unknown';

export interface AlbumTrackRecord extends TrackRecord {
  albumTrackAlbumId: string;
  discNumber: number | null;
  trackNumber: number | null;
  titleOverride: string | null;
  notes: string | null;
  orderSource: AlbumTrackOrderSource;
}

export interface CollectionRecord {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  trackCount: number;
  totalDuration: number;
}

export interface CollectionTrackRecord extends TrackRecord {
  collectionId: string;
  position: number;
  artistName: string | null;
}

export interface CollectionMembershipRecord {
  id: string;
  title: string;
  coverImage: string | null;
}

export interface PostcardProjectRecord {
  id: string;
  title: string;
  trackId: string;
  selectedText: string;
  settings: string;
  outputUri: string | null;
  createdAt: string;
  updatedAt: string;
  trackTitle: string;
  artistName: string | null;
  coverImage: string | null;
}

export interface ConversationRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export type ConversationMessageRole = 'user' | 'model';

export interface ConversationMessageRecord {
  id: string;
  conversationId: string;
  role: ConversationMessageRole;
  text: string;
  createdAt: string;
}

export interface NewAlbumTrack {
  albumId: string;
  trackId: string;
  discNumber?: number | null;
  trackNumber?: number | null;
  titleOverride?: string | null;
  notes?: string | null;
  orderSource?: AlbumTrackOrderSource;
}

export interface PendingCreditInput {
  artistId: string;
  roleId: string;
  notes?: string | null;
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

export type ArchiveDateRange = 'all' | 'week' | 'month' | 'year';

export interface JournalArchiveRecord extends JournalEntryRecord {
  trackTitle: string;
  artistId: string | null;
  artistName: string | null;
  coverImage: string | null;
}

export interface ListeningHistoryArchiveRecord extends ListeningHistoryRecord {
  trackTitle: string;
  artistId: string | null;
  artistName: string | null;
  coverImage: string | null;
  audioUri: string | null;
  duration: number | null;
  lyrics: string | null;
  versionName: string | null;
  workId: string | null;
  versionId: string | null;
}

export interface ArchiveArtistOption {
  id: string;
  name: string;
}

export interface JournalArchiveFilters {
  mood?: string | null;
  dateRange?: ArchiveDateRange;
  artistId?: string | null;
  trackId?: string | null;
  search?: string;
}

export interface ListeningHistoryFilters {
  dateRange?: ArchiveDateRange;
  artistId?: string | null;
  trackId?: string | null;
}

export interface ListeningHistoryOverview {
  total: number;
  topTracks: Array<{ trackId: string; title: string; artistName: string | null; listeningCount: number }>;
  topArtists: Array<{ artistId: string; name: string; listeningCount: number }>;
}

export interface VersionTrackRecord extends TrackRecord {
  artistName: string | null;
  albumTitle: string | null;
}

export interface WorkDetailRecord extends WorkRecord {
  versions: WorkVersionRecord[];
  tracks: TrackRecord[];
  credits: CreditViewRecord[];
}

export interface WorkVersionRecord extends VersionRecord {
  trackCount: number;
}

export interface ChatArchiveContext {
  listeningHistory: Array<{
    trackTitle: string;
    artistName: string | null;
    listenedAt: string;
  }>;
  journalEntries: Array<{
    trackTitle: string;
    artistName: string | null;
    mood: string;
    note: string;
    createdAt: string;
  }>;
  topTracks: Array<{
    title: string;
    artistName: string | null;
    listeningCount: number;
  }>;
  topArtists: Array<{
    name: string;
    listeningCount: number;
  }>;
}

export interface LibraryStats {
  tracks: number;
  albums: number;
  artists: number;
}

export interface HomeTrackRecord extends TrackRecord {
  albumTitle: string | null;
  artistName: string | null;
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
  trackWorkId: string | null;
  trackVersionId: string | null;
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

export type SearchResultType = 'track' | 'album' | 'artist' | 'work';
export type SearchFilter =
  | 'all'
  | 'track'
  | 'artist'
  | 'album'
  | 'lyrics'
  | 'journal'
  | 'credit'
  | 'work';
export type SearchMatchSource = 'title' | 'lyrics' | 'journal' | 'credit' | 'work';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  type: SearchResultType;
  matchSource: SearchMatchSource;
  roleName?: string | null;
}

export type NewArtist = Omit<ArtistRecord, 'id' | 'galleryImages'> & {
  galleryImages?: string | null;
};
export type NewAlbum = Omit<AlbumRecord, 'id'>;
export type NewRole = Pick<RoleRecord, 'name' | 'key'> &
  Partial<Pick<RoleRecord, 'description'>>;
export type NewCredit = {
  artistId: string;
  roleId: string;
  workId?: string | null;
  trackId?: string | null;
  albumId?: string | null;
  notes?: string | null;
};
export type UpdateCredit = Partial<Pick<CreditRecord, 'artistId' | 'roleId' | 'notes'>>;
export type NewWork = Pick<WorkRecord, 'title'> &
  Partial<Omit<WorkRecord, 'id' | 'title' | 'createdAt' | 'updatedAt'>>;
export type UpdateWork = Partial<Omit<NewWork, 'title'>> & { title?: string };
export type NewVersion = Pick<VersionRecord, 'workId' | 'name'> &
  Partial<Omit<VersionRecord, 'id' | 'workId' | 'name' | 'createdAt' | 'updatedAt'>>;
export type UpdateVersion = Partial<Omit<NewVersion, 'name' | 'workId'>> & {
  name?: string;
  workId?: string;
};
export type NewTrack = Omit<
  TrackRecord,
  'id' | 'lyrics' | 'sheetMusicUri' | 'versionName' | 'workId' | 'versionId'
> &
  Partial<
    Pick<TrackRecord, 'lyrics' | 'sheetMusicUri' | 'versionName' | 'workId' | 'versionId'>
  >;
export type UpdateArtist = Partial<NewArtist>;
export type UpdateAlbum = Partial<NewAlbum>;
export type UpdateTrack = Partial<NewTrack>;
export type NewArtistRelationship = Pick<
  ArtistRelationshipRecord,
  'artistId' | 'relatedArtistId'
> &
  Partial<Pick<ArtistRelationshipRecord, 'description'>> & {
    reciprocal?: boolean;
  };

export type NewArtistAlbumLink = {
  artistId: string;
  albumId: string;
  source?: ArtistAlbumLinkSource;
};

export type NewCollection = Pick<CollectionRecord, 'title'> &
  Partial<Pick<CollectionRecord, 'description' | 'coverImage'>>;
export type UpdateCollection = Partial<NewCollection>;

export type NewPostcardProject = Pick<PostcardProjectRecord, 'trackId' | 'selectedText' | 'settings'> &
  Partial<Pick<PostcardProjectRecord, 'title' | 'outputUri'>>;
export type UpdatePostcardProject = Partial<
  Pick<PostcardProjectRecord, 'title' | 'selectedText' | 'settings' | 'outputUri'>
>;

export type NewJournalEntry = Pick<JournalEntryRecord, 'trackId' | 'note' | 'mood'>;
export type UpdateJournalEntry = Pick<JournalEntryRecord, 'note' | 'mood'>;

export type PersonalRelationshipInput = Omit<
  PersonalRelationshipRecord,
  'emotionalTags' | 'personalNote' | 'listeningCount'
> & {
  emotionalTags?: string | null;
  personalNote?: string | null;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function trimNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

async function requireDatabase() {
  const database = await getDatabase();
  if (!database) {
    throw new Error('ذخیره‌سازی SQLite در این محیط در دسترس نیست.');
  }
  return database;
}

const TRACK_COLUMNS =
  'id, title, duration, artistId, albumId, audioUri, coverImage, lyrics, sheetMusicUri, versionName, workId, versionId';
const WORK_COLUMNS =
  'id, title, alternateTitles, description, language, genre, notes, createdAt, updatedAt';
const VERSION_COLUMNS = 'id, workId, name, kind, description, notes, createdAt, updatedAt';
const ROLE_COLUMNS = 'id, name, key, description';
const CREDIT_COLUMNS =
  'id, artistId, roleId, workId, trackId, albumId, notes, createdAt, updatedAt';
const CREDIT_VIEW_COLUMNS = `
  Credits.id,
  Credits.artistId,
  Credits.roleId,
  Credits.workId,
  Credits.trackId,
  Credits.albumId,
  Credits.notes,
  Credits.createdAt,
  Credits.updatedAt,
  Artists.name AS artistName,
  Roles.name AS roleName,
  Roles.key AS roleKey,
  Works.title AS workTitle,
  Tracks.title AS trackTitle,
  Albums.title AS albumTitle`;
// ListeningHistory is authoritative. The legacy relationship column remains
// only for schema compatibility and is intentionally not used for runtime counts.
const LISTENING_COUNT_JOIN = `
  LEFT JOIN (
    SELECT trackId, COUNT(*) AS listeningCount
    FROM ListeningHistory
    GROUP BY trackId
  ) AS ListeningCounts ON ListeningCounts.trackId = Tracks.id`;

export async function addArtist(input: NewArtist): Promise<ArtistRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('نام هنرمند الزامی است.');
  }

  const artist: ArtistRecord = {
    ...input,
    id: createId('artist'),
    name,
    profileImage: input.profileImage ?? null,
    galleryImages: input.galleryImages ?? null,
  };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO Artists (id, name, type, biography, genres, image, profileImage, galleryImages)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      artist.id,
      artist.name,
      artist.type,
      artist.biography,
      artist.genres,
      artist.image,
      artist.profileImage,
      artist.galleryImages,
    ],
  );
  return artist;
}

export async function getArtists(): Promise<ArtistRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<ArtistRecord>(
    'SELECT id, name, type, biography, genres, image, profileImage, galleryImages FROM Artists ORDER BY name COLLATE NOCASE ASC',
    [],
  );
}

export async function getWorks(): Promise<WorkRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<WorkRecord>(
    `SELECT ${WORK_COLUMNS} FROM Works ORDER BY title COLLATE NOCASE ASC`,
    [],
  );
}

export async function getArtistById(id: string): Promise<ArtistRecord | null> {
  const database = await requireDatabase();
  return database.getFirstAsync<ArtistRecord>(
    'SELECT id, name, type, biography, genres, image, profileImage, galleryImages FROM Artists WHERE id = ?',
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
     SET name = ?, type = ?, biography = ?, genres = ?, image = ?, profileImage = ?, galleryImages = ?
     WHERE id = ?`,
    [
      artist.name,
      artist.type,
      artist.biography,
      artist.genres,
      artist.image,
      artist.profileImage,
      artist.galleryImages,
      id,
    ],
  );
  return artist;
}

export async function deleteArtist(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('UPDATE Tracks SET artistId = NULL WHERE artistId = ?', [id]);
  await database.runAsync('DELETE FROM Artists WHERE id = ?', [id]);
}

export async function getArtistRelationships(
  artistId: string,
): Promise<ArtistRelationshipRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<ArtistRelationshipRecord>(
    `SELECT
       ArtistRelationships.id,
       ArtistRelationships.artistId,
       ArtistRelationships.relatedArtistId,
       Artists.name AS relatedArtistName,
       Artists.type AS relatedArtistType,
       ArtistRelationships.description,
       ArtistRelationships.createdAt
     FROM ArtistRelationships
     INNER JOIN Artists ON Artists.id = ArtistRelationships.relatedArtistId
     WHERE ArtistRelationships.artistId = ?
     ORDER BY Artists.name COLLATE NOCASE ASC`,
    [artistId],
  );
}

export async function addArtistRelationship(
  input: NewArtistRelationship,
): Promise<ArtistRelationshipRecord> {
  const artistId = input.artistId.trim();
  const relatedArtistId = input.relatedArtistId.trim();
  const reciprocal = input.reciprocal ?? true;
  if (!artistId || !relatedArtistId) throw new Error('هر دو هنرمند را انتخاب کن.');
  if (artistId === relatedArtistId) throw new Error('یک هنرمند نمی‌تواند با خودش مرتبط شود.');

  const database = await requireDatabase();
  const [artist, relatedArtist] = await Promise.all([
    database.getFirstAsync<{ id: string }>('SELECT id FROM Artists WHERE id = ?', [artistId]),
    database.getFirstAsync<{ id: string }>(
      'SELECT id FROM Artists WHERE id = ?',
      [relatedArtistId],
    ),
  ]);
  if (!artist || !relatedArtist) throw new Error('هنرمند انتخاب‌شده پیدا نشد.');

  const relationship: ArtistRelationshipRecord = {
    id: createId('artist_relation'),
    artistId,
    relatedArtistId,
    relatedArtistName:
      (await database.getFirstAsync<{ name: string }>(
        'SELECT name FROM Artists WHERE id = ?',
        [relatedArtistId],
      ))?.name ?? 'هنرمند',
    relatedArtistType:
      (await database.getFirstAsync<{ type: string | null }>(
        'SELECT type FROM Artists WHERE id = ?',
        [relatedArtistId],
      ))?.type ?? null,
    description: trimNullable(input.description),
    createdAt: new Date().toISOString(),
  };
  try {
    await database.withTransactionAsync(async () => {
      await insertArtistRelationship(database, relationship);
      if (reciprocal) {
        await insertArtistRelationship(database, {
          ...relationship,
          id: createId('artist_relation'),
          artistId: relatedArtistId,
          relatedArtistId: artistId,
          relatedArtistName:
            (await database.getFirstAsync<{ name: string }>(
              'SELECT name FROM Artists WHERE id = ?',
              [artistId],
            ))?.name ?? 'هنرمند',
          relatedArtistType:
            (await database.getFirstAsync<{ type: string | null }>(
              'SELECT type FROM Artists WHERE id = ?',
              [artistId],
            ))?.type ?? null,
        });
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.toLowerCase().includes('unique')) {
      throw new Error('این ارتباط قبلاً برای این هنرمند ثبت شده است.');
    }
    throw error;
  }
  return relationship;
}

export async function deleteArtistRelationship(id: string): Promise<void> {
  const database = await requireDatabase();
  const relationship = await database.getFirstAsync<{
    artistId: string;
    relatedArtistId: string;
  }>(
    'SELECT artistId, relatedArtistId FROM ArtistRelationships WHERE id = ?',
    [id],
  );
  if (!relationship) return;
  await database.runAsync(
    `DELETE FROM ArtistRelationships
      WHERE (artistId = ? AND relatedArtistId = ?)
         OR (artistId = ? AND relatedArtistId = ?)`,
    [
      relationship.artistId,
      relationship.relatedArtistId,
      relationship.relatedArtistId,
      relationship.artistId,
    ],
  );
}

async function insertArtistRelationship(
  database: Awaited<ReturnType<typeof requireDatabase>>,
  relationship: ArtistRelationshipRecord,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO ArtistRelationships
      (id, artistId, relatedArtistId, description, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [
      relationship.id,
      relationship.artistId,
      relationship.relatedArtistId,
      relationship.description,
      relationship.createdAt,
    ],
  );
}

export async function addAlbum(input: NewAlbum): Promise<AlbumRecord> {
  return createAlbumWithCredits(input, []);
}

export async function createAlbumWithCredits(
  input: NewAlbum,
  pendingCredits: PendingCreditInput[],
): Promise<AlbumRecord> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('عنوان آلبوم الزامی است.');
  }

  const album: AlbumRecord = { ...input, id: createId('album'), title };
  const database = await requireDatabase();
  const normalizedCredits = await validatePendingCreditInputs(database, pendingCredits);
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO Albums (id, title, releaseYear, coverImage)
       VALUES (?, ?, ?, ?)`,
      [album.id, album.title, album.releaseYear, album.coverImage],
    );
    for (const pendingCredit of normalizedCredits) {
      await insertCreditWithDatabase(database, {
        ...pendingCredit,
        workId: null,
        trackId: null,
        albumId: album.id,
      });
    }
  });
  return album;
}

export async function getAlbums(): Promise<AlbumRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<AlbumRecord>(
    'SELECT id, title, releaseYear, coverImage FROM Albums ORDER BY title COLLATE NOCASE ASC',
    [],
  );
}

export async function getAlbumsForArtist(artistId: string): Promise<AlbumRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<AlbumRecord>(
    `SELECT Albums.id, Albums.title, Albums.releaseYear, Albums.coverImage
       FROM Albums
       INNER JOIN ArtistAlbums ON ArtistAlbums.albumId = Albums.id
      WHERE ArtistAlbums.artistId = ?
      ORDER BY Albums.title COLLATE NOCASE ASC`,
    [artistId],
  );
}

export async function getAlbumArtistLinks(albumId: string): Promise<ArtistAlbumLinkRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<ArtistAlbumLinkRecord>(
    `SELECT ArtistAlbums.artistId, ArtistAlbums.albumId, ArtistAlbums.source,
            Artists.name AS artistName, Albums.title AS albumTitle
       FROM ArtistAlbums
       INNER JOIN Artists ON Artists.id = ArtistAlbums.artistId
       INNER JOIN Albums ON Albums.id = ArtistAlbums.albumId
      WHERE ArtistAlbums.albumId = ?
      ORDER BY Artists.name COLLATE NOCASE ASC`,
    [albumId],
  );
}

export async function getArtistAlbumLinks(artistId: string): Promise<ArtistAlbumLinkRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<ArtistAlbumLinkRecord>(
    `SELECT ArtistAlbums.artistId, ArtistAlbums.albumId, ArtistAlbums.source,
            Artists.name AS artistName, Albums.title AS albumTitle
       FROM ArtistAlbums
       INNER JOIN Artists ON Artists.id = ArtistAlbums.artistId
       INNER JOIN Albums ON Albums.id = ArtistAlbums.albumId
      WHERE ArtistAlbums.artistId = ?
      ORDER BY Albums.title COLLATE NOCASE ASC`,
    [artistId],
  );
}

export async function addArtistAlbumLink(
  input: NewArtistAlbumLink,
): Promise<ArtistAlbumLinkRecord> {
  const database = await requireDatabase();
  const artist = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Artists WHERE id = ?',
    [input.artistId],
  );
  const album = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Albums WHERE id = ?',
    [input.albumId],
  );
  if (!artist) throw new Error('هنرمند پیدا نشد.');
  if (!album) throw new Error('آلبوم پیدا نشد.');
  await database.runAsync(
    `INSERT OR REPLACE INTO ArtistAlbums (artistId, albumId, source)
     VALUES (?, ?, ?)`,
    [input.artistId, input.albumId, input.source ?? 'explicit'],
  );
  const link = await database.getFirstAsync<ArtistAlbumLinkRecord>(
    `SELECT ArtistAlbums.artistId, ArtistAlbums.albumId, ArtistAlbums.source,
            Artists.name AS artistName, Albums.title AS albumTitle
       FROM ArtistAlbums
       INNER JOIN Artists ON Artists.id = ArtistAlbums.artistId
       INNER JOIN Albums ON Albums.id = ArtistAlbums.albumId
      WHERE ArtistAlbums.artistId = ? AND ArtistAlbums.albumId = ?`,
    [input.artistId, input.albumId],
  );
  if (!link) throw new Error('اتصال هنرمند و آلبوم ذخیره نشد.');
  return link;
}

export async function deleteArtistAlbumLink(
  artistId: string,
  albumId: string,
): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync(
    'DELETE FROM ArtistAlbums WHERE artistId = ? AND albumId = ?',
    [artistId, albumId],
  );
}

export async function replaceAlbumArtists(
  albumId: string,
  artistIds: string[],
): Promise<ArtistAlbumLinkRecord[]> {
  const database = await requireDatabase();
  const album = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Albums WHERE id = ?',
    [albumId],
  );
  if (!album) throw new Error('آلبوم پیدا نشد.');

  const uniqueArtistIds = [...new Set(artistIds.map((artistId) => artistId.trim()).filter(Boolean))];
  for (const artistId of uniqueArtistIds) {
    const artist = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM Artists WHERE id = ?',
      [artistId],
    );
    if (!artist) throw new Error('یکی از هنرمندان انتخاب‌شده پیدا نشد.');
  }

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM ArtistAlbums WHERE albumId = ?', [albumId]);
    for (const artistId of uniqueArtistIds) {
      await database.runAsync(
        `INSERT INTO ArtistAlbums (artistId, albumId, source)
         VALUES (?, ?, 'explicit')`,
        [artistId, albumId],
      );
    }
  });
  return getAlbumArtistLinks(albumId);
}

export async function getAlbumById(id: string): Promise<AlbumRecord | null> {
  const database = await requireDatabase();
  return database.getFirstAsync<AlbumRecord>(
    'SELECT id, title, releaseYear, coverImage FROM Albums WHERE id = ?',
    [id],
  );
}

export async function getRoles(): Promise<RoleRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<RoleRecord>(
    `SELECT ${ROLE_COLUMNS} FROM Roles ORDER BY name COLLATE NOCASE ASC`,
    [],
  );
}

export async function getRoleById(id: string): Promise<RoleRecord | null> {
  const database = await requireDatabase();
  return database.getFirstAsync<RoleRecord>(
    `SELECT ${ROLE_COLUMNS} FROM Roles WHERE id = ?`,
    [id],
  );
}

export async function createRole(input: NewRole): Promise<RoleRecord> {
  const name = input.name.trim();
  const key = input.key.trim();
  if (!name) throw new Error('نام نقش الزامی است.');
  if (!key) throw new Error('کلید نقش الزامی است.');

  const role: RoleRecord = {
    id: createId('role'),
    name,
    key,
    description: trimNullable(input.description),
  };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO Roles (id, name, key, description) VALUES (?, ?, ?, ?)`,
    [role.id, role.name, role.key, role.description],
  );
  return role;
}

export async function getCreditsForWork(workId: string): Promise<CreditViewRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<CreditViewRecord>(
    `SELECT ${CREDIT_VIEW_COLUMNS}
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       LEFT JOIN Works ON Works.id = Credits.workId
       LEFT JOIN Tracks ON Tracks.id = Credits.trackId
       LEFT JOIN Albums ON Albums.id = Credits.albumId
      WHERE Credits.workId = ?
      ORDER BY Roles.name COLLATE NOCASE ASC, Artists.name COLLATE NOCASE ASC`,
    [workId],
  );
}

export async function getCreditsForTrack(trackId: string): Promise<CreditViewRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<CreditViewRecord>(
    `SELECT ${CREDIT_VIEW_COLUMNS}
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       LEFT JOIN Works ON Works.id = Credits.workId
       LEFT JOIN Tracks ON Tracks.id = Credits.trackId
       LEFT JOIN Albums ON Albums.id = Credits.albumId
      WHERE Credits.trackId = ?
      ORDER BY Roles.name COLLATE NOCASE ASC, Artists.name COLLATE NOCASE ASC`,
    [trackId],
  );
}

export async function getCreditsForAlbum(albumId: string): Promise<CreditViewRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<CreditViewRecord>(
    `SELECT ${CREDIT_VIEW_COLUMNS}
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       LEFT JOIN Works ON Works.id = Credits.workId
       LEFT JOIN Tracks ON Tracks.id = Credits.trackId
       LEFT JOIN Albums ON Albums.id = Credits.albumId
      WHERE Credits.albumId = ?
      ORDER BY Roles.name COLLATE NOCASE ASC, Artists.name COLLATE NOCASE ASC`,
    [albumId],
  );
}

export async function getCreditsForArtist(artistId: string): Promise<CreditViewRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<CreditViewRecord>(
    `SELECT ${CREDIT_VIEW_COLUMNS}
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       LEFT JOIN Works ON Works.id = Credits.workId
       LEFT JOIN Tracks ON Tracks.id = Credits.trackId
       LEFT JOIN Albums ON Albums.id = Credits.albumId
      WHERE Credits.artistId = ?
      ORDER BY Roles.name COLLATE NOCASE ASC,
        COALESCE(Works.title, Tracks.title, Albums.title) COLLATE NOCASE ASC`,
    [artistId],
  );
}

export async function addWorkCredit(
  input: Omit<NewCredit, 'trackId' | 'albumId'> & { workId: string },
): Promise<CreditRecord> {
  return insertCredit({ ...input, trackId: null, albumId: null });
}

export async function addTrackCredit(
  input: Omit<NewCredit, 'workId' | 'albumId'> & { trackId: string },
): Promise<CreditRecord> {
  return insertCredit({ ...input, workId: null, albumId: null });
}

export async function addAlbumCredit(
  input: Omit<NewCredit, 'workId' | 'trackId'> & { albumId: string },
): Promise<CreditRecord> {
  return insertCredit({ ...input, workId: null, trackId: null });
}

export async function updateCredit(id: string, input: UpdateCredit): Promise<CreditRecord> {
  const database = await requireDatabase();
  const current = await database.getFirstAsync<CreditRecord>(
    `SELECT ${CREDIT_COLUMNS} FROM Credits WHERE id = ?`,
    [id],
  );
  if (!current) throw new Error('مشارکت پیدا نشد.');

  const target = await validateCreditInput(database, {
    artistId: input.artistId ?? current.artistId,
    roleId: input.roleId ?? current.roleId,
    workId: current.workId,
    trackId: current.trackId,
    albumId: current.albumId,
    notes: input.notes ?? current.notes,
  });
  const credit: CreditRecord = {
    ...current,
    artistId: target.artistId,
    roleId: target.roleId,
    notes: input.notes === undefined ? current.notes : trimNullable(input.notes),
    updatedAt: new Date().toISOString(),
  };
  await ensureCreditIsUnique(database, target, id);
  await database.runAsync(
    'UPDATE Credits SET artistId = ?, roleId = ?, notes = ?, updatedAt = ? WHERE id = ?',
    [
      credit.artistId,
      credit.roleId,
      credit.notes,
      credit.updatedAt,
      id,
    ],
  );
  return credit;
}

export async function removeCredit(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM Credits WHERE id = ?', [id]);
}

async function insertCredit(input: NewCredit): Promise<CreditRecord> {
  const database = await requireDatabase();
  return insertCreditWithDatabase(database, input);
}

async function insertCreditWithDatabase(
  database: Awaited<ReturnType<typeof requireDatabase>>,
  input: NewCredit,
): Promise<CreditRecord> {
  const target = await validateCreditInput(database, input);
  const now = new Date().toISOString();
  const credit: CreditRecord = {
    id: createId('credit'),
    artistId: target.artistId,
    roleId: target.roleId,
    workId: target.workId,
    trackId: target.trackId,
    albumId: target.albumId,
    notes: trimNullable(input.notes),
    createdAt: now,
    updatedAt: now,
  };

  await ensureCreditIsUnique(database, credit);
  await database.runAsync(
    `INSERT INTO Credits
       (id, artistId, roleId, workId, trackId, albumId, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      credit.id,
      credit.artistId,
      credit.roleId,
      credit.workId,
      credit.trackId,
      credit.albumId,
      credit.notes,
      credit.createdAt,
      credit.updatedAt,
    ],
  );
  return credit;
}

async function validatePendingCreditInputs(
  database: Awaited<ReturnType<typeof requireDatabase>>,
  pendingCredits: PendingCreditInput[],
): Promise<PendingCreditInput[]> {
  const seen = new Set<string>();
  const normalizedCredits: PendingCreditInput[] = [];

  for (const pendingCredit of pendingCredits) {
    const artistId = pendingCredit.artistId.trim();
    const roleId = pendingCredit.roleId.trim();
    if (!artistId) throw new Error('هنرمند مشارکت الزامی است.');
    if (!roleId) throw new Error('نقش مشارکت الزامی است.');

    const key = `${artistId}:${roleId}`;
    if (seen.has(key)) {
      throw new Error('این هنرمند و نقش بیش از یک‌بار برای همین مقصد انتخاب شده است.');
    }
    seen.add(key);

    const artist = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM Artists WHERE id = ?',
      [artistId],
    );
    if (!artist) throw new Error('هنرمند مشارکت پیدا نشد.');

    const role = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM Roles WHERE id = ?',
      [roleId],
    );
    if (!role) throw new Error('نقش مشارکت پیدا نشد.');

    normalizedCredits.push({
      artistId,
      roleId,
      notes: trimNullable(pendingCredit.notes),
    });
  }

  return normalizedCredits;
}

async function validateCreditInput(
  database: Awaited<ReturnType<typeof requireDatabase>>,
  input: NewCredit,
): Promise<Pick<CreditRecord, 'artistId' | 'roleId' | 'workId' | 'trackId' | 'albumId'>> {
  const artistId = input.artistId.trim();
  const roleId = input.roleId.trim();
  const workId = input.workId?.trim() || null;
  const trackId = input.trackId?.trim() || null;
  const albumId = input.albumId?.trim() || null;
  if (!artistId) throw new Error('هنرمند مشارکت الزامی است.');
  if (!roleId) throw new Error('نقش مشارکت الزامی است.');

  const targetCount = [workId, trackId, albumId].filter((value) => value !== null).length;
  if (targetCount !== 1) {
    throw new Error('هر مشارکت باید دقیقاً به یک اثر، قطعه یا آلبوم متصل باشد.');
  }

  const artist = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Artists WHERE id = ?',
    [artistId],
  );
  if (!artist) throw new Error('هنرمند مشارکت پیدا نشد.');

  const role = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Roles WHERE id = ?',
    [roleId],
  );
  if (!role) throw new Error('نقش مشارکت پیدا نشد.');

  if (workId) {
    const work = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM Works WHERE id = ?',
      [workId],
    );
    if (!work) throw new Error('اثر مشارکت پیدا نشد.');
  }
  if (trackId) {
    const track = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM Tracks WHERE id = ?',
      [trackId],
    );
    if (!track) throw new Error('قطعهٔ مشارکت پیدا نشد.');
  }
  if (albumId) {
    const album = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM Albums WHERE id = ?',
      [albumId],
    );
    if (!album) throw new Error('آلبوم مشارکت پیدا نشد.');
  }

  return { artistId, roleId, workId, trackId, albumId };
}

async function ensureCreditIsUnique(
  database: Awaited<ReturnType<typeof requireDatabase>>,
  target: Pick<CreditRecord, 'artistId' | 'roleId' | 'workId' | 'trackId' | 'albumId'>,
  excludedId?: string,
): Promise<void> {
  const targetColumn = target.workId ? 'workId' : target.trackId ? 'trackId' : 'albumId';
  const targetId = target[targetColumn];
  const duplicate = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM Credits
      WHERE artistId = ? AND roleId = ? AND ${targetColumn} = ?
        ${excludedId ? 'AND id != ?' : ''}`,
    excludedId
      ? [target.artistId, target.roleId, targetId, excludedId]
      : [target.artistId, target.roleId, targetId],
  );
  if (duplicate) {
    throw new Error('این هنرمند و نقش قبلاً برای همین مقصد ثبت شده است.');
  }
}

export async function createWork(input: NewWork): Promise<WorkRecord> {
  const title = input.title.trim();
  if (!title) throw new Error('عنوان اثر الزامی است.');

  const now = new Date().toISOString();
  const work: WorkRecord = {
    id: createId('work'),
    title,
    alternateTitles: trimNullable(input.alternateTitles),
    description: trimNullable(input.description),
    language: trimNullable(input.language),
    genre: trimNullable(input.genre),
    notes: trimNullable(input.notes),
    createdAt: now,
    updatedAt: now,
  };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO Works
       (id, title, alternateTitles, description, language, genre, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      work.id,
      work.title,
      work.alternateTitles,
      work.description,
      work.language,
      work.genre,
      work.notes,
      work.createdAt,
      work.updatedAt,
    ],
  );
  return work;
}

export async function getWorkById(id: string): Promise<WorkRecord | null> {
  const database = await requireDatabase();
  return database.getFirstAsync<WorkRecord>(
    `SELECT ${WORK_COLUMNS} FROM Works WHERE id = ?`,
    [id],
  );
}

export async function updateWork(id: string, input: UpdateWork): Promise<WorkRecord> {
  const current = await getWorkById(id);
  if (!current) throw new Error('اثر پیدا نشد.');

  const work: WorkRecord = {
    ...current,
    ...input,
    title: input.title === undefined ? current.title : input.title.trim(),
    alternateTitles:
      input.alternateTitles === undefined
        ? current.alternateTitles
        : trimNullable(input.alternateTitles),
    description:
      input.description === undefined ? current.description : trimNullable(input.description),
    language: input.language === undefined ? current.language : trimNullable(input.language),
    genre: input.genre === undefined ? current.genre : trimNullable(input.genre),
    notes: input.notes === undefined ? current.notes : trimNullable(input.notes),
    updatedAt: new Date().toISOString(),
  };
  if (!work.title) throw new Error('عنوان اثر الزامی است.');

  const database = await requireDatabase();
  await database.runAsync(
    `UPDATE Works
        SET title = ?, alternateTitles = ?, description = ?, language = ?,
            genre = ?, notes = ?, updatedAt = ?
      WHERE id = ?`,
    [
      work.title,
      work.alternateTitles,
      work.description,
      work.language,
      work.genre,
      work.notes,
      work.updatedAt,
      id,
    ],
  );
  return work;
}

export async function deleteWork(id: string): Promise<void> {
  const database = await requireDatabase();
  const versionCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM Versions WHERE workId = ?',
    [id],
  );
  if (Number(versionCount?.count ?? 0) > 0) {
    throw new Error('ابتدا نسخه‌های این اثر را حذف یا به اثر دیگری منتقل کن.');
  }
  const trackCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM Tracks WHERE workId = ?',
    [id],
  );
  if (Number(trackCount?.count ?? 0) > 0) {
    throw new Error('ابتدا قطعه‌های متصل به این اثر را جدا کن.');
  }
  await database.runAsync('DELETE FROM Works WHERE id = ?', [id]);
}

export async function createVersion(input: NewVersion): Promise<VersionRecord> {
  const name = input.name.trim();
  if (!name) throw new Error('نام نسخه الزامی است.');

  const database = await requireDatabase();
  const work = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Works WHERE id = ?',
    [input.workId],
  );
  if (!work) throw new Error('اثر مرتبط با نسخه پیدا نشد.');

  const now = new Date().toISOString();
  const version: VersionRecord = {
    id: createId('version'),
    workId: input.workId,
    name,
    kind: trimNullable(input.kind),
    description: trimNullable(input.description),
    notes: trimNullable(input.notes),
    createdAt: now,
    updatedAt: now,
  };
  await database.runAsync(
    `INSERT INTO Versions
       (id, workId, name, kind, description, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      version.id,
      version.workId,
      version.name,
      version.kind,
      version.description,
      version.notes,
      version.createdAt,
      version.updatedAt,
    ],
  );
  return version;
}

export async function getVersionById(id: string): Promise<VersionRecord | null> {
  const database = await requireDatabase();
  return database.getFirstAsync<VersionRecord>(
    `SELECT ${VERSION_COLUMNS} FROM Versions WHERE id = ?`,
    [id],
  );
}

export async function updateVersion(
  id: string,
  input: UpdateVersion,
): Promise<VersionRecord> {
  const current = await getVersionById(id);
  if (!current) throw new Error('نسخه پیدا نشد.');

  const workId = input.workId ?? current.workId;
  const name = input.name === undefined ? current.name : input.name.trim();
  if (!name) throw new Error('نام نسخه الزامی است.');

  const database = await requireDatabase();
  const work = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Works WHERE id = ?',
    [workId],
  );
  if (!work) throw new Error('اثر مرتبط با نسخه پیدا نشد.');

  const conflictingTracks = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM Tracks
      WHERE versionId = ? AND workId IS NOT NULL AND workId != ?`,
    [id, workId],
  );
  if (Number(conflictingTracks?.count ?? 0) > 0) {
    throw new Error('اثر جدید با رابطهٔ فعلی قطعه‌های این نسخه سازگار نیست.');
  }

  const version: VersionRecord = {
    ...current,
    ...input,
    workId,
    name,
    kind: input.kind === undefined ? current.kind : trimNullable(input.kind),
    description:
      input.description === undefined ? current.description : trimNullable(input.description),
    notes: input.notes === undefined ? current.notes : trimNullable(input.notes),
    updatedAt: new Date().toISOString(),
  };
  await database.runAsync(
    `UPDATE Versions
        SET workId = ?, name = ?, kind = ?, description = ?, notes = ?, updatedAt = ?
      WHERE id = ?`,
    [
      version.workId,
      version.name,
      version.kind,
      version.description,
      version.notes,
      version.updatedAt,
      id,
    ],
  );
  return version;
}

export async function deleteVersion(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM Versions WHERE id = ?', [id]);
}

export async function getVersionsByWorkId(workId: string): Promise<VersionRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<VersionRecord>(
    `SELECT ${VERSION_COLUMNS}
       FROM Versions
      WHERE workId = ?
      ORDER BY name COLLATE NOCASE ASC`,
    [workId],
  );
}

export async function getTracksByWorkId(workId: string): Promise<TrackRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<TrackRecord>(
    `SELECT ${TRACK_COLUMNS}
       FROM Tracks
      WHERE workId = ?
      ORDER BY title COLLATE NOCASE ASC`,
    [workId],
  );
}

export async function getWorkDetail(id: string): Promise<WorkDetailRecord | null> {
  const work = await getWorkById(id);
  if (!work) return null;
  const [versions, tracks, credits] = await Promise.all([
    getVersionsByWorkId(id),
    getTracksByWorkId(id),
    getCreditsForWork(id),
  ]);
  const trackCounts = new Map<string, number>();
  for (const track of tracks) {
    if (track.versionId) trackCounts.set(track.versionId, (trackCounts.get(track.versionId) ?? 0) + 1);
  }
  return {
    ...work,
    versions: versions.map((version) => ({ ...version, trackCount: trackCounts.get(version.id) ?? 0 })),
    tracks,
    credits,
  };
}

export async function getAlbumTracks(albumId: string): Promise<AlbumTrackRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<AlbumTrackRecord>(
    `SELECT
       Tracks.id, COALESCE(AlbumTracks.titleOverride, Tracks.title) AS title,
       Tracks.duration, Tracks.artistId, Tracks.albumId,
       Tracks.audioUri, Tracks.coverImage, Tracks.lyrics, Tracks.sheetMusicUri,
       Tracks.versionName, Tracks.workId, Tracks.versionId,
       AlbumTracks.albumId AS albumTrackAlbumId,
       AlbumTracks.discNumber,
       AlbumTracks.trackNumber,
       AlbumTracks.titleOverride,
       AlbumTracks.notes,
       AlbumTracks.orderSource
     FROM AlbumTracks
     INNER JOIN Tracks ON Tracks.id = AlbumTracks.trackId
     WHERE AlbumTracks.albumId = ?
     ORDER BY
       CASE
         WHEN AlbumTracks.discNumber IS NULL OR AlbumTracks.trackNumber IS NULL THEN 1
         ELSE 0
       END ASC,
       AlbumTracks.discNumber ASC,
       AlbumTracks.trackNumber ASC,
       Tracks.title COLLATE NOCASE ASC`,
    [albumId],
  );
}

export async function addAlbumTrack(input: NewAlbumTrack): Promise<AlbumTrackRecord> {
  const database = await requireDatabase();
  const discNumber = input.discNumber ?? null;
  const trackNumber = input.trackNumber ?? null;
  const hasDiscNumber = discNumber !== null;
  const hasTrackNumber = trackNumber !== null;

  if (hasDiscNumber !== hasTrackNumber) {
    throw new Error('شمارهٔ دیسک و شمارهٔ قطعه باید هر دو ثبت شوند یا هر دو خالی باشند.');
  }
  if (
    (discNumber !== null && (!Number.isInteger(discNumber) || discNumber < 1)) ||
    (trackNumber !== null && (!Number.isInteger(trackNumber) || trackNumber < 1))
  ) {
    throw new Error('شمارهٔ دیسک و قطعه باید عدد صحیح مثبت باشند.');
  }

  const orderSource: AlbumTrackOrderSource =
    input.orderSource ?? (hasDiscNumber ? 'explicit' : 'unknown');
  if (orderSource === 'explicit' && !hasDiscNumber) {
    throw new Error('ترتیب صریح باید شمارهٔ دیسک و قطعه داشته باشد.');
  }
  if (orderSource !== 'explicit' && hasDiscNumber) {
    throw new Error('ترتیب شماره‌گذاری‌شده باید به‌عنوان ترتیب صریح ذخیره شود.');
  }

  await database.runAsync(
    `INSERT INTO AlbumTracks
       (albumId, trackId, discNumber, trackNumber, titleOverride, notes, orderSource)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.albumId,
      input.trackId,
      discNumber,
      trackNumber,
      input.titleOverride ?? null,
      input.notes ?? null,
      orderSource,
    ],
  );

  const saved = await database.getFirstAsync<AlbumTrackRecord>(
    `SELECT
       Tracks.id, Tracks.title, Tracks.duration, Tracks.artistId, Tracks.albumId,
       Tracks.audioUri, Tracks.coverImage, Tracks.lyrics, Tracks.sheetMusicUri,
       Tracks.versionName, Tracks.workId, Tracks.versionId,
       AlbumTracks.albumId AS albumTrackAlbumId,
       AlbumTracks.discNumber,
       AlbumTracks.trackNumber,
       AlbumTracks.titleOverride,
       AlbumTracks.notes,
       AlbumTracks.orderSource
     FROM AlbumTracks
     INNER JOIN Tracks ON Tracks.id = AlbumTracks.trackId
     WHERE AlbumTracks.albumId = ? AND AlbumTracks.trackId = ?`,
    [input.albumId, input.trackId],
  );
  if (!saved) throw new Error('رابطهٔ آلبوم و قطعه ذخیره نشد.');
  return saved;
}

export async function replaceAlbumTracks(
  albumId: string,
  entries: NewAlbumTrack[],
): Promise<AlbumTrackRecord[]> {
  const database = await requireDatabase();
  const album = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Albums WHERE id = ?',
    [albumId],
  );
  if (!album) throw new Error('آلبوم پیدا نشد.');

  const trackIds = new Set<string>();
  const positions = new Set<string>();
  for (const entry of entries) {
    if (entry.albumId !== albumId) throw new Error('رابطهٔ آلبوم و قطعه معتبر نیست.');
    if (trackIds.has(entry.trackId)) throw new Error('یک قطعه را بیش از یک‌بار انتخاب کرده‌اید.');
    trackIds.add(entry.trackId);
    const discNumber = entry.discNumber ?? null;
    const trackNumber = entry.trackNumber ?? null;
    if ((discNumber === null) !== (trackNumber === null)) {
      throw new Error('شمارهٔ دیسک و شمارهٔ قطعه باید هر دو ثبت شوند یا هر دو خالی باشند.');
    }
    if (
      (discNumber !== null && (!Number.isInteger(discNumber) || discNumber < 1)) ||
      (trackNumber !== null && (!Number.isInteger(trackNumber) || trackNumber < 1))
    ) {
      throw new Error('شمارهٔ دیسک و قطعه باید عدد صحیح مثبت باشند.');
    }
    if (discNumber !== null && trackNumber !== null) {
      const position = `${discNumber}:${trackNumber}`;
      if (positions.has(position)) throw new Error('دو قطعه نمی‌توانند جایگاه یکسان داشته باشند.');
      positions.add(position);
    }
    const track = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM Tracks WHERE id = ?',
      [entry.trackId],
    );
    if (!track) throw new Error('یکی از قطعه‌های انتخاب‌شده پیدا نشد.');
  }

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM AlbumTracks WHERE albumId = ?', [albumId]);
    await database.runAsync('UPDATE Tracks SET albumId = NULL WHERE albumId = ?', [albumId]);
    for (const entry of entries) {
      const hasPosition = entry.discNumber != null && entry.trackNumber != null;
      await database.runAsync(
        `INSERT INTO AlbumTracks
          (albumId, trackId, discNumber, trackNumber, titleOverride, notes, orderSource)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          albumId,
          entry.trackId,
          entry.discNumber ?? null,
          entry.trackNumber ?? null,
          entry.titleOverride ?? null,
          entry.notes ?? null,
          hasPosition ? 'explicit' : 'unknown',
        ],
      );
    }
  });
  return getAlbumTracks(albumId);
}

async function ensureLegacyAlbumMembership(
  database: Awaited<ReturnType<typeof requireDatabase>>,
  albumId: string | null,
  trackId: string,
): Promise<void> {
  if (!albumId) return;
  await database.runAsync(
    `INSERT OR IGNORE INTO AlbumTracks
       (albumId, trackId, discNumber, trackNumber, titleOverride, notes, orderSource)
     VALUES (?, ?, NULL, NULL, NULL, NULL, 'legacy')`,
    [albumId, trackId],
  );
}

async function validateTrackDomainReferences(
  database: Awaited<ReturnType<typeof requireDatabase>>,
  workId: string | null,
  versionId: string | null,
): Promise<void> {
  if (workId) {
    const work = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM Works WHERE id = ?',
      [workId],
    );
    if (!work) throw new Error('اثر مرتبط با قطعه پیدا نشد.');
  }

  if (!versionId) return;
  const version = await database.getFirstAsync<{ id: string; workId: string }>(
    'SELECT id, workId FROM Versions WHERE id = ?',
    [versionId],
  );
  if (!version) throw new Error('نسخهٔ مرتبط با قطعه پیدا نشد.');
  if (workId && version.workId !== workId) {
    throw new Error('نسخهٔ قطعه باید به همان اثر انتخاب‌شده تعلق داشته باشد.');
  }
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
  return createTrackWithCredits(input, []);
}

export async function createTrackWithCredits(
  input: NewTrack,
  pendingCredits: PendingCreditInput[],
): Promise<TrackRecord> {
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
    workId: input.workId ?? null,
    versionId: input.versionId ?? null,
  };
  const database = await requireDatabase();
  await validateTrackDomainReferences(database, track.workId, track.versionId);
  const normalizedCredits = await validatePendingCreditInputs(database, pendingCredits);
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO Tracks
         (id, title, duration, artistId, albumId, audioUri, coverImage, lyrics,
          sheetMusicUri, versionName, workId, versionId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        track.workId,
        track.versionId,
      ],
    );
    await ensureLegacyAlbumMembership(database, track.albumId, track.id);
    for (const pendingCredit of normalizedCredits) {
      await insertCreditWithDatabase(database, {
        ...pendingCredit,
        workId: null,
        trackId: track.id,
        albumId: null,
      });
    }
  });
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
       Tracks.versionName, Tracks.workId, Tracks.versionId, Albums.title AS albumTitle,
       Artists.name AS artistName
     FROM Tracks
     LEFT JOIN Albums ON Albums.id = Tracks.albumId
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
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

export async function getOtherTracksWithSameTitle(
  trackId: string,
  title: string,
): Promise<VersionTrackRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<VersionTrackRecord>(
    `SELECT
       Tracks.id, Tracks.title, Tracks.duration, Tracks.artistId, Tracks.albumId,
       Tracks.audioUri, Tracks.coverImage, Tracks.lyrics, Tracks.sheetMusicUri,
       Tracks.versionName, Tracks.workId, Tracks.versionId,
       Artists.name AS artistName, Albums.title AS albumTitle
     FROM Tracks
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
     LEFT JOIN Albums ON Albums.id = Tracks.albumId
     WHERE Tracks.id != ?
       AND lower(trim(Tracks.title)) = lower(trim(?))
     ORDER BY Tracks.rowid ASC`,
    [trackId, title],
  );
}

export async function getTracksByAlbumId(albumId: string): Promise<TrackRecord[]> {
  const albumTracks = await getAlbumTracks(albumId);
  return albumTracks.map(({ albumTrackAlbumId, discNumber, trackNumber, titleOverride, notes, orderSource, ...track }) => track);
}

export async function getAlbumsForTrack(trackId: string): Promise<AlbumRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<AlbumRecord>(
    `SELECT Albums.id, Albums.title, Albums.releaseYear, Albums.coverImage
       FROM Albums
       INNER JOIN AlbumTracks ON AlbumTracks.albumId = Albums.id
      WHERE AlbumTracks.trackId = ?
      ORDER BY Albums.title COLLATE NOCASE ASC`,
    [trackId],
  );
}

export async function getCollections(limit?: number): Promise<CollectionRecord[]> {
  const database = await requireDatabase();
  const safeLimit = limit === undefined ? null : Math.max(1, Math.min(Math.floor(limit), 50));
  const rows = await database.getAllAsync<CollectionRecord>(
    `SELECT
       Collections.id, Collections.title, Collections.description, Collections.coverImage,
       Collections.createdAt, Collections.updatedAt,
       COUNT(CollectionTracks.trackId) AS trackCount,
       COALESCE(SUM(Tracks.duration), 0) AS totalDuration
     FROM Collections
     LEFT JOIN CollectionTracks ON CollectionTracks.collectionId = Collections.id
     LEFT JOIN Tracks ON Tracks.id = CollectionTracks.trackId
     GROUP BY Collections.id
     ORDER BY datetime(Collections.updatedAt) DESC, Collections.rowid DESC
     ${safeLimit === null ? '' : 'LIMIT ?'}`,
    safeLimit === null ? [] : [safeLimit],
  );
  return rows;
}

export async function getCollectionById(id: string): Promise<CollectionRecord | null> {
  const collections = await getCollections();
  return collections.find((collection) => collection.id === id) ?? null;
}

export async function getCollectionTracks(collectionId: string): Promise<CollectionTrackRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<CollectionTrackRecord>(
    `SELECT
       Tracks.id, Tracks.title, Tracks.duration, Tracks.artistId, Tracks.albumId,
       Tracks.audioUri, Tracks.coverImage, Tracks.lyrics, Tracks.sheetMusicUri,
       Tracks.versionName, Tracks.workId, Tracks.versionId,
       CollectionTracks.collectionId, CollectionTracks.position,
       Artists.name AS artistName
     FROM CollectionTracks
     INNER JOIN Tracks ON Tracks.id = CollectionTracks.trackId
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
     WHERE CollectionTracks.collectionId = ?
     ORDER BY CollectionTracks.position ASC`,
    [collectionId],
  );
}

export async function getCollectionsForTrack(trackId: string): Promise<CollectionMembershipRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<CollectionMembershipRecord>(
    `SELECT Collections.id, Collections.title, Collections.coverImage
       FROM Collections
       INNER JOIN CollectionTracks ON CollectionTracks.collectionId = Collections.id
      WHERE CollectionTracks.trackId = ?
      ORDER BY Collections.title COLLATE NOCASE ASC`,
    [trackId],
  );
}

export async function createCollection(input: NewCollection): Promise<CollectionRecord> {
  const title = input.title.trim();
  if (!title) throw new Error('نام مجموعه را وارد کن.');
  const now = new Date().toISOString();
  const collection = {
    id: createId('collection'),
    title,
    description: trimNullable(input.description),
    coverImage: trimNullable(input.coverImage),
    createdAt: now,
    updatedAt: now,
  };
  const database = await requireDatabase();
  await database.runAsync(
    `INSERT INTO Collections (id, title, description, coverImage, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      collection.id,
      collection.title,
      collection.description,
      collection.coverImage,
      collection.createdAt,
      collection.updatedAt,
    ],
  );
  return { ...collection, trackCount: 0, totalDuration: 0 };
}

export async function updateCollection(
  id: string,
  input: UpdateCollection,
): Promise<CollectionRecord> {
  const current = await getCollectionById(id);
  if (!current) throw new Error('مجموعه پیدا نشد.');
  const title = input.title === undefined ? current.title : input.title.trim();
  if (!title) throw new Error('نام مجموعه را وارد کن.');
  const description = input.description === undefined
    ? current.description
    : trimNullable(input.description);
  const coverImage = input.coverImage === undefined
    ? current.coverImage
    : trimNullable(input.coverImage);
  const updatedAt = new Date().toISOString();
  const database = await requireDatabase();
  await database.runAsync(
    `UPDATE Collections
        SET title = ?, description = ?, coverImage = ?, updatedAt = ?
      WHERE id = ?`,
    [title, description, coverImage, updatedAt, id],
  );
  return {
    ...current,
    title,
    description,
    coverImage,
    updatedAt,
  };
}

export async function deleteCollection(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM Collections WHERE id = ?', [id]);
}

export async function addTrackToCollection(collectionId: string, trackId: string): Promise<CollectionTrackRecord> {
  const database = await requireDatabase();
  const collection = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Collections WHERE id = ?',
    [collectionId],
  );
  if (!collection) throw new Error('مجموعه پیدا نشد.');
  const track = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Tracks WHERE id = ?',
    [trackId],
  );
  if (!track) throw new Error('قطعه پیدا نشد.');
  const existing = await database.getFirstAsync<{ position: number }>(
    'SELECT position FROM CollectionTracks WHERE collectionId = ? AND trackId = ?',
    [collectionId, trackId],
  );
  if (existing) throw new Error('این قطعه از قبل در این مجموعه هست.');
  const last = await database.getFirstAsync<{ position: number | null }>(
    'SELECT MAX(position) AS position FROM CollectionTracks WHERE collectionId = ?',
    [collectionId],
  );
  const position = (last?.position ?? -1) + 1;
  await database.runAsync(
    'INSERT INTO CollectionTracks (collectionId, trackId, position) VALUES (?, ?, ?)',
    [collectionId, trackId, position],
  );
  await database.runAsync(
    'UPDATE Collections SET updatedAt = ? WHERE id = ?',
    [new Date().toISOString(), collectionId],
  );
  const saved = (await getCollectionTracks(collectionId)).find((item) => item.id === trackId);
  if (!saved) throw new Error('افزودن قطعه به مجموعه انجام نشد.');
  return saved;
}

export async function removeTrackFromCollection(collectionId: string, trackId: string): Promise<void> {
  const database = await requireDatabase();
  const removed = await database.getFirstAsync<{ position: number }>(
    'SELECT position FROM CollectionTracks WHERE collectionId = ? AND trackId = ?',
    [collectionId, trackId],
  );
  await database.runAsync(
    'DELETE FROM CollectionTracks WHERE collectionId = ? AND trackId = ?',
    [collectionId, trackId],
  );
  if (removed) {
    await database.runAsync(
      `UPDATE CollectionTracks
          SET position = position - 1
        WHERE collectionId = ? AND position > ?`,
      [collectionId, removed.position],
    );
  }
  await database.runAsync(
    'UPDATE Collections SET updatedAt = ? WHERE id = ?',
    [new Date().toISOString(), collectionId],
  );
}

export async function moveCollectionTrack(
  collectionId: string,
  trackId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const database = await requireDatabase();
  const current = await database.getFirstAsync<{ position: number }>(
    'SELECT position FROM CollectionTracks WHERE collectionId = ? AND trackId = ?',
    [collectionId, trackId],
  );
  if (!current) throw new Error('قطعه در این مجموعه نیست.');
  const neighbor = await database.getFirstAsync<{ trackId: string; position: number }>(
    `SELECT trackId, position
       FROM CollectionTracks
      WHERE collectionId = ? AND position ${direction === 'up' ? '<' : '>'} ?
      ORDER BY position ${direction === 'up' ? 'DESC' : 'ASC'}
      LIMIT 1`,
    [collectionId, current.position],
  );
  if (!neighbor) return;
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      'UPDATE CollectionTracks SET position = -1 WHERE collectionId = ? AND trackId = ?',
      [collectionId, trackId],
    );
    await database.runAsync(
      'UPDATE CollectionTracks SET position = ? WHERE collectionId = ? AND trackId = ?',
      [current.position, collectionId, neighbor.trackId],
    );
    await database.runAsync(
      'UPDATE CollectionTracks SET position = ? WHERE collectionId = ? AND trackId = ?',
      [neighbor.position, collectionId, trackId],
    );
    await database.runAsync(
      'UPDATE Collections SET updatedAt = ? WHERE id = ?',
      [new Date().toISOString(), collectionId],
    );
  });
}

export async function getPostcardProjects(
  trackId?: string,
  limit?: number,
): Promise<PostcardProjectRecord[]> {
  const database = await requireDatabase();
  const safeLimit = limit === undefined ? null : Math.max(1, Math.min(Math.floor(limit), 100));
  const where = trackId ? 'WHERE PostcardProjects.trackId = ?' : '';
  const parameters: (string | number)[] = trackId ? [trackId] : [];
  if (safeLimit !== null) parameters.push(safeLimit);

  return database.getAllAsync<PostcardProjectRecord>(
    `SELECT
       PostcardProjects.id,
       PostcardProjects.title,
       PostcardProjects.trackId,
       PostcardProjects.selectedText,
       PostcardProjects.settings,
       PostcardProjects.outputUri,
       PostcardProjects.createdAt,
       PostcardProjects.updatedAt,
       Tracks.title AS trackTitle,
       Artists.name AS artistName,
       Tracks.coverImage AS coverImage
     FROM PostcardProjects
     INNER JOIN Tracks ON Tracks.id = PostcardProjects.trackId
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
     ${where}
     ORDER BY datetime(PostcardProjects.updatedAt) DESC, PostcardProjects.rowid DESC
     ${safeLimit === null ? '' : 'LIMIT ?'}`,
    parameters,
  );
}

export async function getPostcardProjectById(id: string): Promise<PostcardProjectRecord | null> {
  const projects = await getPostcardProjects();
  return projects.find((project) => project.id === id) ?? null;
}

export async function createPostcardProject(input: NewPostcardProject): Promise<PostcardProjectRecord> {
  const database = await requireDatabase();
  const track = await database.getFirstAsync<{
    id: string;
    title: string;
  }>('SELECT id, title FROM Tracks WHERE id = ?', [input.trackId]);
  if (!track) throw new Error('قطعه برای عکس‌نوشته پیدا نشد.');

  const selectedText = input.selectedText.trim();
  if (!selectedText) throw new Error('متن عکس‌نوشته نمی‌تواند خالی باشد.');
  if (!input.settings.trim()) throw new Error('تنظیمات عکس‌نوشته آماده نیست.');

  const now = new Date().toISOString();
  const projectId = createId('postcard');
  await database.runAsync(
    `INSERT INTO PostcardProjects
       (id, title, trackId, selectedText, settings, outputUri, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      input.title?.trim() || track.title,
      track.id,
      selectedText,
      input.settings,
      input.outputUri ?? null,
      now,
      now,
    ],
  );

  const saved = await getPostcardProjectById(projectId);
  if (!saved) throw new Error('ذخیره‌ی پروژه‌ی عکس‌نوشته انجام نشد.');
  return saved;
}

export async function updatePostcardProject(
  id: string,
  input: UpdatePostcardProject,
): Promise<PostcardProjectRecord> {
  const current = await getPostcardProjectById(id);
  if (!current) throw new Error('پروژه‌ی عکس‌نوشته پیدا نشد.');
  const database = await requireDatabase();
  const title = input.title === undefined ? current.title : input.title.trim() || current.trackTitle;
  const selectedText =
    input.selectedText === undefined ? current.selectedText : input.selectedText.trim();
  const settings = input.settings === undefined ? current.settings : input.settings.trim();
  if (!selectedText) throw new Error('متن عکس‌نوشته نمی‌تواند خالی باشد.');
  if (!settings) throw new Error('تنظیمات عکس‌نوشته آماده نیست.');
  const updatedAt = new Date().toISOString();

  await database.runAsync(
    `UPDATE PostcardProjects
        SET title = ?, selectedText = ?, settings = ?, outputUri = ?, updatedAt = ?
      WHERE id = ?`,
    [
      title,
      selectedText,
      settings,
      input.outputUri === undefined ? current.outputUri : input.outputUri,
      updatedAt,
      id,
    ],
  );
  const saved = await getPostcardProjectById(id);
  if (!saved) throw new Error('به‌روزرسانی پروژه‌ی عکس‌نوشته انجام نشد.');
  return saved;
}

export async function deletePostcardProject(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM PostcardProjects WHERE id = ?', [id]);
}

export async function getConversations(): Promise<ConversationRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<ConversationRecord>(
    `SELECT
       Conversations.id,
       Conversations.title,
       Conversations.createdAt,
       Conversations.updatedAt,
       COUNT(ConversationMessages.id) AS messageCount
     FROM Conversations
     LEFT JOIN ConversationMessages
       ON ConversationMessages.conversationId = Conversations.id
     GROUP BY Conversations.id
     ORDER BY datetime(Conversations.updatedAt) DESC, Conversations.rowid DESC`,
    [],
  );
}

export async function getLatestConversation(): Promise<ConversationRecord | null> {
  const conversations = await getConversations();
  return conversations[0] ?? null;
}

export async function getConversationMessages(
  conversationId: string,
): Promise<ConversationMessageRecord[]> {
  const database = await requireDatabase();
  return database.getAllAsync<ConversationMessageRecord>(
    `SELECT id, conversationId, role, text, createdAt
       FROM ConversationMessages
      WHERE conversationId = ?
      ORDER BY datetime(createdAt) ASC, rowid ASC`,
    [conversationId],
  );
}

export async function createConversation(firstUserMessage: string): Promise<ConversationRecord> {
  const text = firstUserMessage.trim();
  if (!text) throw new Error('پیام گفتگو نمی‌تواند خالی باشد.');
  const database = await requireDatabase();
  const now = new Date().toISOString();
  const id = createId('conversation');
  const messageId = createId('message');

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      'INSERT INTO Conversations (id, title, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
      [id, shortenConversationTitle(text), now, now],
    );
    await database.runAsync(
      `INSERT INTO ConversationMessages
         (id, conversationId, role, text, createdAt)
       VALUES (?, ?, 'user', ?, ?)`,
      [messageId, id, text, now],
    );
  });

  const saved = (await getConversations()).find((conversation) => conversation.id === id);
  if (!saved) throw new Error('ساخت گفت‌وگو انجام نشد.');
  return saved;
}

export async function appendConversationMessage(
  conversationId: string,
  role: ConversationMessageRole,
  message: string,
): Promise<ConversationMessageRecord> {
  const text = message.trim();
  if (!text) throw new Error('پیام گفتگو نمی‌تواند خالی باشد.');
  const database = await requireDatabase();
  const conversation = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM Conversations WHERE id = ?',
    [conversationId],
  );
  if (!conversation) throw new Error('گفت‌وگو پیدا نشد.');
  const record: ConversationMessageRecord = {
    id: createId('message'),
    conversationId,
    role,
    text,
    createdAt: new Date().toISOString(),
  };
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO ConversationMessages (id, conversationId, role, text, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [record.id, record.conversationId, record.role, record.text, record.createdAt],
    );
    await database.runAsync(
      'UPDATE Conversations SET updatedAt = ? WHERE id = ?',
      [record.createdAt, conversationId],
    );
  });
  return record;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error('عنوان گفتگو نمی‌تواند خالی باشد.');
  const database = await requireDatabase();
  const result = await database.runAsync(
    'UPDATE Conversations SET title = ?, updatedAt = ? WHERE id = ?',
    [shortenConversationTitle(cleanTitle, 60), new Date().toISOString(), id],
  );
  if (result.changes === 0) throw new Error('گفت‌وگو پیدا نشد.');
}

export async function deleteConversation(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM Conversations WHERE id = ?', [id]);
}

function shortenConversationTitle(value: string, maxLength = 42): string {
  const cleanValue = value.trim().replace(/\s+/g, ' ');
  if (cleanValue.length <= maxLength) return cleanValue;
  return `${cleanValue.slice(0, maxLength - 1).trim()}…`;
}

export async function getMusicGraphRows(): Promise<MusicGraphRow[]> {
  const database = await requireDatabase();
  return database.getAllAsync<MusicGraphRow>(
    `SELECT
       Artists.id AS artistId,
       Artists.name AS artistName,
       Artists.profileImage AS artistProfileImage,
        Albums.id AS albumId,
       Albums.title AS albumTitle,
       Albums.releaseYear AS albumReleaseYear,
       Albums.coverImage AS albumCoverImage,
       Tracks.id AS trackId,
       Tracks.title AS trackTitle,
       Tracks.duration AS trackDuration,
       Tracks.artistId AS trackArtistId,
        AlbumTracks.albumId AS trackAlbumId,
       Tracks.audioUri AS trackAudioUri,
       Tracks.coverImage AS trackCoverImage,
       Tracks.lyrics AS trackLyrics,
       Tracks.sheetMusicUri AS trackSheetMusicUri,
        Tracks.versionName AS trackVersionName,
        Tracks.workId AS trackWorkId,
        Tracks.versionId AS trackVersionId
     FROM Tracks
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
      LEFT JOIN AlbumTracks ON AlbumTracks.trackId = Tracks.id
      LEFT JOIN Albums ON Albums.id = AlbumTracks.albumId
     ORDER BY
       COALESCE(Artists.name, '') COLLATE NOCASE ASC,
       COALESCE(Albums.title, '') COLLATE NOCASE ASC,
        CASE
          WHEN AlbumTracks.discNumber IS NULL OR AlbumTracks.trackNumber IS NULL THEN 1
          ELSE 0
        END ASC,
        AlbumTracks.discNumber ASC,
        AlbumTracks.trackNumber ASC,
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
       Tracks.versionName, Tracks.workId, Tracks.versionId, Albums.title AS albumTitle,
       Artists.name AS artistName
     FROM Tracks
     INNER JOIN PersonalRelationships
       ON PersonalRelationships.trackId = Tracks.id
     LEFT JOIN Albums ON Albums.id = Tracks.albumId
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
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

  if (filter === 'credit') {
    return database.getAllAsync<SearchResult>(
      `SELECT Tracks.id, Tracks.title,
          Artists.name || ' • ' || Roles.name AS subtitle,
          'track' AS type, 'credit' AS matchSource, Roles.name AS roleName
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       INNER JOIN Tracks ON Tracks.id = Credits.trackId
       WHERE Artists.name LIKE ? COLLATE NOCASE OR Roles.name LIKE ? COLLATE NOCASE
       UNION ALL
       SELECT Albums.id, Albums.title,
          Artists.name || ' • ' || Roles.name,
          'album', 'credit', Roles.name
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       INNER JOIN Albums ON Albums.id = Credits.albumId
       WHERE Artists.name LIKE ? COLLATE NOCASE OR Roles.name LIKE ? COLLATE NOCASE
       UNION ALL
       SELECT Works.id, Works.title,
          Artists.name || ' • ' || Roles.name,
          'work', 'credit', Roles.name
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       INNER JOIN Works ON Works.id = Credits.workId
       WHERE Artists.name LIKE ? COLLATE NOCASE OR Roles.name LIKE ? COLLATE NOCASE
       ORDER BY title COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, pattern, pattern, pattern, pattern, pattern, safeLimit],
    );
  }

  if (filter === 'work') {
    return database.getAllAsync<SearchResult>(
      `SELECT id, title, alternateTitles AS subtitle,
          'work' AS type, 'work' AS matchSource
       FROM Works
       WHERE title LIKE ? COLLATE NOCASE
          OR COALESCE(alternateTitles, '') LIKE ? COLLATE NOCASE
       ORDER BY title COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, pattern, safeLimit],
    );
  }

  const [
    trackResults,
    albumResults,
    artistResults,
    journalResults,
    workResults,
    creditResults,
  ] = await Promise.all([
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
       ORDER BY title COLLATE NOCASE ASC
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
    database.getAllAsync<SearchResult>(
      `SELECT id, title, alternateTitles AS subtitle,
          'work' AS type, 'work' AS matchSource
       FROM Works
       WHERE title LIKE ? COLLATE NOCASE
          OR COALESCE(alternateTitles, '') LIKE ? COLLATE NOCASE
       ORDER BY title COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, pattern, safeLimit],
    ),
    database.getAllAsync<SearchResult>(
      `SELECT Tracks.id, Tracks.title,
          Artists.name || ' • ' || Roles.name AS subtitle,
          'track' AS type, 'credit' AS matchSource, Roles.name AS roleName
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       INNER JOIN Tracks ON Tracks.id = Credits.trackId
       WHERE Artists.name LIKE ? COLLATE NOCASE OR Roles.name LIKE ? COLLATE NOCASE
       UNION ALL
       SELECT Albums.id, Albums.title,
          Artists.name || ' • ' || Roles.name,
          'album', 'credit', Roles.name
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       INNER JOIN Albums ON Albums.id = Credits.albumId
       WHERE Artists.name LIKE ? COLLATE NOCASE OR Roles.name LIKE ? COLLATE NOCASE
       UNION ALL
       SELECT Works.id, Works.title,
          Artists.name || ' • ' || Roles.name,
          'work', 'credit', Roles.name
       FROM Credits
       INNER JOIN Artists ON Artists.id = Credits.artistId
       INNER JOIN Roles ON Roles.id = Credits.roleId
       INNER JOIN Works ON Works.id = Credits.workId
       WHERE Artists.name LIKE ? COLLATE NOCASE OR Roles.name LIKE ? COLLATE NOCASE
       ORDER BY title COLLATE NOCASE ASC
       LIMIT ?`,
      [pattern, pattern, pattern, pattern, pattern, pattern, safeLimit],
    ),
  ]);

  const seen = new Set<string>();
  return [
    ...trackResults,
    ...albumResults,
    ...artistResults,
    ...journalResults,
    ...workResults,
    ...creditResults,
  ]
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
    workId: input.workId === undefined ? current.workId : input.workId,
    versionId: input.versionId === undefined ? current.versionId : input.versionId,
  };
  if (!track.title.trim()) throw new Error('عنوان قطعه الزامی است.');

  const database = await requireDatabase();
  await validateTrackDomainReferences(database, track.workId, track.versionId);
  await database.runAsync(
    `UPDATE Tracks
      SET title = ?, duration = ?, artistId = ?, albumId = ?, audioUri = ?, coverImage = ?,
          lyrics = ?, sheetMusicUri = ?, versionName = ?, workId = ?, versionId = ?
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
      track.workId,
      track.versionId,
      id,
    ],
  );
  if (current.audioUri !== track.audioUri) {
    await deleteAudioFile(current.audioUri);
  }
  await ensureLegacyAlbumMembership(database, track.albumId, track.id);
  return track;
}

export async function assignTrackToWork(
  trackId: string,
  workId: string | null,
): Promise<TrackRecord> {
  const current = await getTrackById(trackId);
  if (!current) throw new Error('قطعه پیدا نشد.');

  const database = await requireDatabase();
  await validateTrackDomainReferences(database, workId, current.versionId);
  await database.runAsync('UPDATE Tracks SET workId = ? WHERE id = ?', [workId, trackId]);
  const updated = await getTrackById(trackId);
  if (!updated) throw new Error('رابطهٔ قطعه با اثر ذخیره نشد.');
  return updated;
}

export async function assignTrackToVersion(
  trackId: string,
  versionId: string | null,
): Promise<TrackRecord> {
  const current = await getTrackById(trackId);
  if (!current) throw new Error('قطعه پیدا نشد.');

  const database = await requireDatabase();
  await validateTrackDomainReferences(database, current.workId, versionId);
  await database.runAsync('UPDATE Tracks SET versionId = ? WHERE id = ?', [versionId, trackId]);
  const updated = await getTrackById(trackId);
  if (!updated) throw new Error('رابطهٔ قطعه با نسخه ذخیره نشد.');
  return updated;
}

export async function deleteTrack(id: string): Promise<void> {
  const track = await getTrackById(id);
  if (!track) return;
  await deleteAudioFile(track.audioUri);
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM Tracks WHERE id = ?', [id]);
}

export async function migrateCachedAudioUris(): Promise<number> {
  const database = await requireDatabase();
  const tracks = await database.getAllAsync<{ id: string; audioUri: string | null }>(
    'SELECT id, audioUri FROM Tracks WHERE audioUri IS NOT NULL',
  );
  const migrated = await migrateCachedAudioFiles(tracks);
  for (const track of migrated) {
    await database.runAsync('UPDATE Tracks SET audioUri = ? WHERE id = ?', [
      track.audioUri,
      track.id,
    ]);
  }
  return migrated.length;
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
       Tracks.workId,
       Tracks.versionId,
       Artists.name AS artistName,
       Albums.title AS albumTitle,
        COALESCE(ListeningCounts.listeningCount, 0) AS listeningCount,
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
      ${LISTENING_COUNT_JOIN}
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
    `SELECT
       PersonalRelationships.trackId,
       PersonalRelationships.rating,
       PersonalRelationships.favorite,
       PersonalRelationships.emotionalTags,
       PersonalRelationships.personalNote,
       (
         SELECT COUNT(*)
         FROM ListeningHistory
         WHERE ListeningHistory.trackId = PersonalRelationships.trackId
       ) AS listeningCount
     FROM PersonalRelationships
     WHERE PersonalRelationships.trackId = ?`,
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
       (trackId, rating, favorite, emotionalTags, personalNote)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(trackId) DO UPDATE SET
       rating = excluded.rating,
       favorite = excluded.favorite,
       emotionalTags = excluded.emotionalTags,
       personalNote = excluded.personalNote`,
    [
      input.trackId,
      input.rating,
      input.favorite ? 1 : 0,
      input.emotionalTags ?? null,
      input.personalNote ?? null,
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

export async function getLatestJournalMood(trackId: string): Promise<string | null> {
  const database = await requireDatabase();
  const row = await database.getFirstAsync<Pick<JournalEntryRecord, 'mood'>>(
    `SELECT mood
     FROM JournalEntries
     WHERE trackId = ?
     ORDER BY datetime(createdAt) DESC
     LIMIT 1`,
    [trackId],
  );
  return row?.mood ?? null;
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

function archiveDateCondition(
  column: 'JournalEntries.createdAt' | 'ListeningHistory.listenedAt',
  range: ArchiveDateRange = 'all',
): { sql: string; params: Array<string | number | null> } {
  const modifierByRange: Record<Exclude<ArchiveDateRange, 'all'>, string> = {
    week: '-7 days',
    month: '-1 month',
    year: '-1 year',
  };
  if (range === 'all') return { sql: '', params: [] };
  return {
    sql: ` AND datetime(${column}) >= datetime('now', 'localtime', '${modifierByRange[range]}')`,
    params: [],
  };
}

export async function getJournalEntriesPage(
  filters: JournalArchiveFilters = {},
  limit = 30,
  offset = 0,
): Promise<JournalArchiveRecord[]> {
  const database = await requireDatabase();
  const where: string[] = [];
  const params: Array<string | number | null> = [];
  const date = archiveDateCondition('JournalEntries.createdAt', filters.dateRange);
  where.push('1 = 1');
  if (filters.mood) {
    where.push('JournalEntries.mood = ?');
    params.push(filters.mood);
  }
  if (filters.artistId) {
    where.push('Tracks.artistId = ?');
    params.push(filters.artistId);
  }
  if (filters.trackId) {
    where.push('JournalEntries.trackId = ?');
    params.push(filters.trackId);
  }
  if (filters.search?.trim()) {
    const pattern = `%${filters.search.trim()}%`;
    where.push('(JournalEntries.note LIKE ? COLLATE NOCASE OR Tracks.title LIKE ? COLLATE NOCASE)');
    params.push(pattern, pattern);
  }
  where.push(date.sql.replace(/^ AND /, ''));
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const safeOffset = Math.max(0, Math.floor(offset));
  return database.getAllAsync<JournalArchiveRecord>(
    `SELECT
       JournalEntries.id,
       JournalEntries.trackId,
       JournalEntries.note,
       JournalEntries.mood,
       JournalEntries.createdAt,
       Tracks.title AS trackTitle,
       Tracks.artistId,
       Tracks.coverImage,
       Artists.name AS artistName
     FROM JournalEntries
     INNER JOIN Tracks ON Tracks.id = JournalEntries.trackId
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
     WHERE ${where.filter(Boolean).join(' AND ')}
     ORDER BY datetime(JournalEntries.createdAt) DESC
     LIMIT ? OFFSET ?`,
    [...params, ...date.params, safeLimit, safeOffset],
  );
}

export async function getJournalEntryArtists(): Promise<ArchiveArtistOption[]> {
  const database = await requireDatabase();
  return database.getAllAsync<ArchiveArtistOption>(
    `SELECT DISTINCT Artists.id, Artists.name
     FROM JournalEntries
     INNER JOIN Tracks ON Tracks.id = JournalEntries.trackId
     INNER JOIN Artists ON Artists.id = Tracks.artistId
     ORDER BY Artists.name COLLATE NOCASE ASC`,
    [],
  );
}

export async function getJournalEntryCount(filters: JournalArchiveFilters = {}): Promise<number> {
  const database = await requireDatabase();
  const where: string[] = ['1 = 1'];
  const params: Array<string | number | null> = [];
  const date = archiveDateCondition('JournalEntries.createdAt', filters.dateRange);
  if (filters.mood) {
    where.push('JournalEntries.mood = ?');
    params.push(filters.mood);
  }
  if (filters.artistId) {
    where.push('Tracks.artistId = ?');
    params.push(filters.artistId);
  }
  if (filters.trackId) {
    where.push('JournalEntries.trackId = ?');
    params.push(filters.trackId);
  }
  if (filters.search?.trim()) {
    const pattern = `%${filters.search.trim()}%`;
    where.push('(JournalEntries.note LIKE ? COLLATE NOCASE OR Tracks.title LIKE ? COLLATE NOCASE)');
    params.push(pattern, pattern);
  }
  if (date.sql) where.push(date.sql.replace(/^ AND /, ''));
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM JournalEntries
     INNER JOIN Tracks ON Tracks.id = JournalEntries.trackId
     WHERE ${where.join(' AND ')}`,
    [...params, ...date.params],
  );
  return row?.count ?? 0;
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

export async function getListeningHistoryPage(
  filters: ListeningHistoryFilters = {},
  limit = 30,
  offset = 0,
): Promise<ListeningHistoryArchiveRecord[]> {
  const database = await requireDatabase();
  const date = archiveDateCondition('ListeningHistory.listenedAt', filters.dateRange);
  const where: string[] = ['1 = 1'];
  const params: Array<string | number | null> = [];
  if (filters.artistId) {
    where.push('Tracks.artistId = ?');
    params.push(filters.artistId);
  }
  if (filters.trackId) {
    where.push('ListeningHistory.trackId = ?');
    params.push(filters.trackId);
  }
  if (date.sql) where.push(date.sql.replace(/^ AND /, ''));
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
  const safeOffset = Math.max(0, Math.floor(offset));
  return database.getAllAsync<ListeningHistoryArchiveRecord>(
    `SELECT
       ListeningHistory.id,
       ListeningHistory.trackId,
       ListeningHistory.listenedAt,
       Tracks.title AS trackTitle,
       Tracks.artistId,
       Tracks.coverImage,
       Tracks.audioUri,
       Tracks.duration,
       Tracks.lyrics,
       Tracks.versionName,
       Tracks.workId,
       Tracks.versionId,
       Artists.name AS artistName
     FROM ListeningHistory
     INNER JOIN Tracks ON Tracks.id = ListeningHistory.trackId
     LEFT JOIN Artists ON Artists.id = Tracks.artistId
     WHERE ${where.join(' AND ')}
     ORDER BY datetime(ListeningHistory.listenedAt) DESC
     LIMIT ? OFFSET ?`,
    [...params, ...date.params, safeLimit, safeOffset],
  );
}

export async function getListeningHistoryOverview(
  filters: ListeningHistoryFilters = {},
): Promise<ListeningHistoryOverview> {
  const database = await requireDatabase();
  const date = archiveDateCondition('ListeningHistory.listenedAt', filters.dateRange);
  const whereParts: string[] = ['1 = 1'];
  const params: Array<string | number | null> = [];
  if (filters.artistId) {
    whereParts.push('Tracks.artistId = ?');
    params.push(filters.artistId);
  }
  if (filters.trackId) {
    whereParts.push('ListeningHistory.trackId = ?');
    params.push(filters.trackId);
  }
  if (date.sql) whereParts.push(date.sql.replace(/^ AND /, ''));
  const where = whereParts.join(' AND ');
  const [totalRow, topTracks, topArtists] = await Promise.all([
    database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM ListeningHistory
       INNER JOIN Tracks ON Tracks.id = ListeningHistory.trackId
       WHERE ${where}`,
      [...params, ...date.params],
    ),
    database.getAllAsync<ListeningHistoryOverview['topTracks'][number]>(
      `SELECT
         Tracks.id AS trackId,
         Tracks.title,
         Artists.name AS artistName,
         COUNT(ListeningHistory.id) AS listeningCount
       FROM ListeningHistory
       INNER JOIN Tracks ON Tracks.id = ListeningHistory.trackId
       LEFT JOIN Artists ON Artists.id = Tracks.artistId
       WHERE ${where}
       GROUP BY Tracks.id
       ORDER BY listeningCount DESC, Tracks.title COLLATE NOCASE ASC
       LIMIT 5`,
      [...params, ...date.params],
    ),
    database.getAllAsync<ListeningHistoryOverview['topArtists'][number]>(
      `SELECT
         Artists.id AS artistId,
         Artists.name,
         COUNT(ListeningHistory.id) AS listeningCount
       FROM ListeningHistory
       INNER JOIN Tracks ON Tracks.id = ListeningHistory.trackId
       INNER JOIN Artists ON Artists.id = Tracks.artistId
       WHERE ${where}
       GROUP BY Artists.id
       ORDER BY listeningCount DESC, Artists.name COLLATE NOCASE ASC
       LIMIT 5`,
      [...params, ...date.params],
    ),
  ]);
  return {
    total: totalRow?.count ?? 0,
    topTracks,
    topArtists,
  };
}

export async function deleteListeningHistoryEntry(id: string): Promise<void> {
  const database = await requireDatabase();
  await database.runAsync('DELETE FROM ListeningHistory WHERE id = ?', [id]);
}

export async function deleteListeningHistory(filters: ListeningHistoryFilters = {}): Promise<void> {
  const database = await requireDatabase();
  const date = archiveDateCondition('ListeningHistory.listenedAt', filters.dateRange);
  const where: string[] = ['1 = 1'];
  const params: Array<string | number | null> = [];
  if (filters.artistId) {
    where.push('trackId IN (SELECT id FROM Tracks WHERE artistId = ?)');
    params.push(filters.artistId);
  }
  if (filters.trackId) {
    where.push('trackId = ?');
    params.push(filters.trackId);
  }
  if (date.sql) where.push(date.sql.replace(/^ AND /, ''));
  await database.runAsync(`DELETE FROM ListeningHistory WHERE ${where.join(' AND ')}`, [...params, ...date.params]);
}

export async function getChatArchiveContext(): Promise<ChatArchiveContext> {
  const database = await requireDatabase();
  const [listeningHistory, journalEntries, topTracks, topArtists] = await Promise.all([
    database.getAllAsync<ChatArchiveContext['listeningHistory'][number]>(
      `SELECT
         Tracks.title AS trackTitle,
         Artists.name AS artistName,
         ListeningHistory.listenedAt
       FROM ListeningHistory
       INNER JOIN Tracks ON Tracks.id = ListeningHistory.trackId
       LEFT JOIN Artists ON Artists.id = Tracks.artistId
       ORDER BY datetime(ListeningHistory.listenedAt) DESC
       LIMIT 40`,
      [],
    ),
    database.getAllAsync<ChatArchiveContext['journalEntries'][number]>(
      `SELECT
         Tracks.title AS trackTitle,
         Artists.name AS artistName,
         JournalEntries.mood,
         JournalEntries.note,
         JournalEntries.createdAt
       FROM JournalEntries
       INNER JOIN Tracks ON Tracks.id = JournalEntries.trackId
       LEFT JOIN Artists ON Artists.id = Tracks.artistId
       ORDER BY datetime(JournalEntries.createdAt) DESC
       LIMIT 30`,
      [],
    ),
    database.getAllAsync<ChatArchiveContext['topTracks'][number]>(
      `SELECT
         Tracks.title,
         Artists.name AS artistName,
         COUNT(ListeningHistory.id) AS listeningCount
       FROM Tracks
       LEFT JOIN Artists ON Artists.id = Tracks.artistId
       LEFT JOIN ListeningHistory ON ListeningHistory.trackId = Tracks.id
       GROUP BY Tracks.id
       ORDER BY listeningCount DESC, Tracks.title COLLATE NOCASE ASC
       LIMIT 12`,
      [],
    ),
    database.getAllAsync<ChatArchiveContext['topArtists'][number]>(
      `SELECT
         Artists.name,
         COUNT(ListeningHistory.id) AS listeningCount
       FROM Artists
       INNER JOIN Tracks ON Tracks.artistId = Artists.id
       LEFT JOIN ListeningHistory ON ListeningHistory.trackId = Tracks.id
       GROUP BY Artists.id
       ORDER BY listeningCount DESC, Artists.name COLLATE NOCASE ASC
       LIMIT 12`,
      [],
    ),
  ]);

  return { listeningHistory, journalEntries, topTracks, topArtists };
}