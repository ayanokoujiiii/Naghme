import { getDatabase } from '@/src/db/database';
import { audioFileExists } from '@/src/audio/audioFiles';
import type {
  AlbumRecord,
  AlbumTrackRecord,
  ArtistRecord,
  ArtistAlbumLinkRecord,
  ArtistRelationshipRecord,
  CreditRecord,
  JournalEntryRecord,
  ListeningHistoryRecord,
  PersonalRelationshipRecord,
  RoleRecord,
  TrackRecord,
  VersionRecord,
  WorkRecord,
} from '@/src/db/queries';

type ArtistAlbumBackupRecord = Pick<
  ArtistAlbumLinkRecord,
  'artistId' | 'albumId' | 'source'
> & {
  createdAt: string;
};

export interface ArchiveBackup {
  format: 'naghme-archive';
  version: 1;
  exportedAt: string;
  artists: ArtistRecord[];
  albums: AlbumRecord[];
  /** Optional extension to Version 1; absent in older backups. */
  roles?: RoleRecord[];
  /** Optional extension to Version 1; absent in older backups. */
  credits?: CreditRecord[];
  tracks: TrackRecord[];
  personalRelationships: PersonalRelationshipRecord[];
  journalEntries: JournalEntryRecord[];
  listeningHistory: ListeningHistoryRecord[];
  /** Optional extension to Version 1; absent in older backups. */
  albumTracks?: AlbumTrackRecord[];
  /** Optional extension to Version 1; absent in older backups. */
  works?: WorkRecord[];
  /** Optional extension to Version 1; absent in older backups. */
  versions?: VersionRecord[];
  /** Optional extension to Version 1; absent in older backups. */
  artistRelationships?: ArtistRelationshipRecord[];
  /** Optional extension to Version 1; absent in older backups. */
  artistAlbums?: ArtistAlbumBackupRecord[];
}

export interface RestoreSummary {
  artists: number;
  albums: number;
  tracks: number;
  personalRelationships: number;
  journalEntries: number;
  listeningHistory: number;
  albumTracks: number;
  works: number;
  versions: number;
  roles: number;
  credits: number;
  artistRelationships: number;
  artistAlbums: number;
  missingAudioFiles?: number;
}

const ARTIST_BACKUP_COLUMNS =
  'id, name, type, biography, genres, image, profileImage, galleryImages';
const ALBUM_BACKUP_COLUMNS = 'id, title, releaseYear, coverImage';
const ROLE_BACKUP_COLUMNS = 'id, name, key, description';
const CREDIT_BACKUP_COLUMNS =
  'id, artistId, roleId, workId, trackId, albumId, notes, createdAt, updatedAt';
const TRACK_BACKUP_COLUMNS =
  'id, title, duration, artistId, albumId, audioUri, coverImage, lyrics, sheetMusicUri, versionName, workId, versionId';
const WORK_BACKUP_COLUMNS =
  'id, title, alternateTitles, description, language, genre, notes, createdAt, updatedAt';
const VERSION_BACKUP_COLUMNS =
  'id, workId, name, kind, description, notes, createdAt, updatedAt';
const ARTIST_RELATIONSHIP_BACKUP_COLUMNS =
  'id, artistId, relatedArtistId, description, createdAt';
const ARTIST_ALBUM_BACKUP_COLUMNS = 'artistId, albumId, source, createdAt';
const RELATIONSHIP_BACKUP_COLUMNS = `
  trackId, rating, favorite, emotionalTags, personalNote,
  (
    SELECT COUNT(*)
    FROM ListeningHistory
    WHERE ListeningHistory.trackId = PersonalRelationships.trackId
  ) AS listeningCount`;
const JOURNAL_BACKUP_COLUMNS = 'id, trackId, note, mood, createdAt';
const HISTORY_BACKUP_COLUMNS = 'id, trackId, listenedAt';
const ALBUM_TRACK_BACKUP_COLUMNS =
  'Tracks.id, Tracks.title, Tracks.duration, Tracks.artistId, Tracks.albumId, ' +
  'Tracks.audioUri, Tracks.coverImage, Tracks.lyrics, Tracks.sheetMusicUri, Tracks.versionName, ' +
  'Tracks.workId, Tracks.versionId, ' +
  'AlbumTracks.albumId AS albumTrackAlbumId, AlbumTracks.discNumber, AlbumTracks.trackNumber, ' +
  'AlbumTracks.titleOverride, AlbumTracks.notes, AlbumTracks.orderSource';

async function requireDatabase() {
  const database = await getDatabase();
  if (!database) {
    throw new Error('خروجی گرفتن از آرشیو روی پیش‌نمایش وب در دسترس نیست؛ برنامه را در Android باز کن.');
  }
  return database;
}

export async function createArchiveBackup(): Promise<string> {
  const database = await requireDatabase();
  const [
    artists,
    albums,
    roles,
    credits,
    tracks,
    personalRelationships,
    journalEntries,
    listeningHistory,
    albumTracks,
    works,
    versions,
    artistRelationships,
    artistAlbums,
  ] = await Promise.all([
    database.getAllAsync<ArtistRecord>(
      `SELECT ${ARTIST_BACKUP_COLUMNS} FROM Artists ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<AlbumRecord>(
      `SELECT ${ALBUM_BACKUP_COLUMNS} FROM Albums ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<RoleRecord>(
      `SELECT ${ROLE_BACKUP_COLUMNS} FROM Roles ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<CreditRecord>(
      `SELECT ${CREDIT_BACKUP_COLUMNS} FROM Credits ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<TrackRecord>(
      `SELECT ${TRACK_BACKUP_COLUMNS} FROM Tracks ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<PersonalRelationshipRecord>(
      `SELECT ${RELATIONSHIP_BACKUP_COLUMNS}
       FROM PersonalRelationships ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<JournalEntryRecord>(
      `SELECT ${JOURNAL_BACKUP_COLUMNS} FROM JournalEntries ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<ListeningHistoryRecord>(
      `SELECT ${HISTORY_BACKUP_COLUMNS} FROM ListeningHistory ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<AlbumTrackRecord>(
      `SELECT ${ALBUM_TRACK_BACKUP_COLUMNS}
       FROM AlbumTracks
       INNER JOIN Tracks ON Tracks.id = AlbumTracks.trackId
       ORDER BY AlbumTracks.albumId, AlbumTracks.discNumber, AlbumTracks.trackNumber,
         Tracks.title COLLATE NOCASE ASC`,
      [],
    ),
    database.getAllAsync<WorkRecord>(
      `SELECT ${WORK_BACKUP_COLUMNS} FROM Works ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<VersionRecord>(
      `SELECT ${VERSION_BACKUP_COLUMNS} FROM Versions ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<ArtistRelationshipRecord>(
      `SELECT ${ARTIST_RELATIONSHIP_BACKUP_COLUMNS}
         FROM ArtistRelationships ORDER BY rowid ASC`,
      [],
    ),
    database.getAllAsync<ArtistAlbumBackupRecord>(
      `SELECT ${ARTIST_ALBUM_BACKUP_COLUMNS}
         FROM ArtistAlbums ORDER BY rowid ASC`,
      [],
    ),
  ]);

  const backup: ArchiveBackup = {
    format: 'naghme-archive',
    version: 1,
    exportedAt: new Date().toISOString(),
    artists,
    albums,
    roles,
    credits,
    tracks,
    personalRelationships,
    journalEntries,
    listeningHistory,
    albumTracks,
    works,
    versions,
    artistRelationships,
    artistAlbums,
  };

  return JSON.stringify(backup, null, 2);
}

export async function restoreArchiveBackup(json: string): Promise<RestoreSummary> {
  const database = await requireDatabase();
  const backup = parseBackup(json);
  const artistIds = new Set(backup.artists.map((artist) => artist.id));
  const roleIds = new Set((backup.roles ?? []).map((role) => role.id));
  const albumIds = new Set(backup.albums.map((album) => album.id));
  const trackIds = new Set(backup.tracks.map((track) => track.id));
  const workIds = new Set((backup.works ?? []).map((work) => work.id));
  const versionIds = new Set((backup.versions ?? []).map((version) => version.id));
  const versionsById = new Map((backup.versions ?? []).map((version) => [version.id, version]));
  const relationshipIds = new Set(
    (backup.artistRelationships ?? []).map((relationship) => relationship.id),
  );
  const validArtistAlbums = (backup.artistAlbums ?? []).filter(
    (relationship) =>
      artistIds.has(relationship.artistId) && albumIds.has(relationship.albumId),
  );

  for (const track of backup.tracks) {
    if (track.artistId && !artistIds.has(track.artistId)) {
      throw new Error(`هنرمند مرتبط با قطعه‌ی «${track.title}» در فایل پیدا نشد.`);
    }
    if (track.albumId && !albumIds.has(track.albumId)) {
      throw new Error(`آلبوم مرتبط با قطعه‌ی «${track.title}» در فایل پیدا نشد.`);
    }
    if (track.workId && !workIds.has(track.workId)) {
      throw new Error(`اثر مرتبط با قطعه‌ی «${track.title}» در فایل پیدا نشد.`);
    }
    if (track.versionId && !versionIds.has(track.versionId)) {
      throw new Error(`نسخهٔ مرتبط با قطعه‌ی «${track.title}» در فایل پیدا نشد.`);
    }
    const version = track.versionId ? versionsById.get(track.versionId) : undefined;
    if (version && track.workId && version.workId !== track.workId) {
      throw new Error(`اثر و نسخهٔ قطعه‌ی «${track.title}» با هم سازگار نیستند.`);
    }
  }
  for (const credit of backup.credits ?? []) {
    if (!artistIds.has(credit.artistId)) {
      throw new Error('یکی از مشارکت‌ها به هنرمند نامعتبر اشاره می‌کند.');
    }
    if (!roleIds.has(credit.roleId)) {
      throw new Error('یکی از مشارکت‌ها به نقش نامعتبر اشاره می‌کند.');
    }
    const targetCount = [credit.workId, credit.trackId, credit.albumId].filter(
      (value) => value !== null,
    ).length;
    if (targetCount !== 1) {
      throw new Error('هر مشارکت در فایل پشتیبان باید دقیقاً یک مقصد داشته باشد.');
    }
    if (credit.workId && !workIds.has(credit.workId)) {
      throw new Error('یکی از مشارکت‌ها به اثر نامعتبر اشاره می‌کند.');
    }
    if (credit.trackId && !trackIds.has(credit.trackId)) {
      throw new Error('یکی از مشارکت‌ها به قطعهٔ نامعتبر اشاره می‌کند.');
    }
    if (credit.albumId && !albumIds.has(credit.albumId)) {
      throw new Error('یکی از مشارکت‌ها به آلبوم نامعتبر اشاره می‌کند.');
    }
  }
  for (const version of backup.versions ?? []) {
    if (!workIds.has(version.workId)) {
      throw new Error(`اثر مرتبط با نسخهٔ «${version.name}» در فایل پیدا نشد.`);
    }
  }
  for (const relationship of backup.artistRelationships ?? []) {
    if (!artistIds.has(relationship.artistId) || !artistIds.has(relationship.relatedArtistId)) {
      throw new Error('یکی از ارتباط‌های هنرمندان به هنرمند نامعتبر اشاره می‌کند.');
    }
    if (relationship.artistId === relationship.relatedArtistId) {
      throw new Error('ارتباط هنرمند با خودش معتبر نیست.');
    }
  }
  for (const relationship of backup.personalRelationships) {
    if (!trackIds.has(relationship.trackId)) {
      throw new Error('یکی از رابطه‌های شخصی به قطعه‌ای نامعتبر اشاره می‌کند.');
    }
  }
  for (const entry of backup.journalEntries) {
    if (!trackIds.has(entry.trackId)) {
      throw new Error('یکی از یادداشت‌های دفترچه به قطعه‌ای نامعتبر اشاره می‌کند.');
    }
  }
  for (const entry of backup.listeningHistory) {
    if (!trackIds.has(entry.trackId)) {
      throw new Error('یکی از موارد تاریخچه به قطعه‌ای نامعتبر اشاره می‌کند.');
    }
  }
  for (const relationship of backup.albumTracks ?? []) {
    if (!albumIds.has(relationship.albumTrackAlbumId)) {
      throw new Error('یکی از رابطه‌های آلبوم و قطعه به آلبوم نامعتبر اشاره می‌کند.');
    }
    if (!trackIds.has(relationship.id)) {
      throw new Error('یکی از رابطه‌های آلبوم و قطعه به قطعهٔ نامعتبر اشاره می‌کند.');
    }
  }

  // Restore intentionally remains a merge/upsert: destination-only records
  // are preserved, while backup records are inserted or updated by stable ID.
  await database.withTransactionAsync(async () => {
    for (const artist of backup.artists) {
      await database.runAsync(
        `INSERT INTO Artists (id, name, type, biography, genres, image, profileImage, galleryImages)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           type = excluded.type,
           biography = excluded.biography,
           genres = excluded.genres,
           image = excluded.image,
           profileImage = excluded.profileImage,
           galleryImages = excluded.galleryImages`,
        [
          artist.id,
          artist.name,
          artist.type,
          artist.biography,
          artist.genres,
          artist.image,
          artist.profileImage ?? null,
          artist.galleryImages,
        ],
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

    for (const role of backup.roles ?? []) {
      await database.runAsync(
        `INSERT INTO Roles (id, name, key, description)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           key = excluded.key,
           description = excluded.description`,
        [role.id, role.name, role.key, role.description],
      );
    }

    for (const work of backup.works ?? []) {
      await database.runAsync(
        `INSERT INTO Works
           (id, title, alternateTitles, description, language, genre, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           alternateTitles = excluded.alternateTitles,
           description = excluded.description,
           language = excluded.language,
           genre = excluded.genre,
           notes = excluded.notes,
           updatedAt = excluded.updatedAt`,
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
    }

    for (const version of backup.versions ?? []) {
      await database.runAsync(
        `INSERT INTO Versions
           (id, workId, name, kind, description, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           workId = excluded.workId,
           name = excluded.name,
           kind = excluded.kind,
           description = excluded.description,
           notes = excluded.notes,
           updatedAt = excluded.updatedAt`,
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
    }

    for (const track of backup.tracks) {
      await database.runAsync(
        `INSERT INTO Tracks
           (id, title, duration, artistId, albumId, audioUri, coverImage, lyrics,
            sheetMusicUri, versionName, workId, versionId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           duration = excluded.duration,
           artistId = excluded.artistId,
           albumId = excluded.albumId,
           audioUri = excluded.audioUri,
            coverImage = excluded.coverImage,
            lyrics = excluded.lyrics,
            sheetMusicUri = excluded.sheetMusicUri,
            versionName = excluded.versionName,
            workId = excluded.workId,
            versionId = excluded.versionId`,
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
      if (track.albumId) {
        await database.runAsync(
          `INSERT OR IGNORE INTO AlbumTracks
             (albumId, trackId, discNumber, trackNumber, titleOverride, notes, orderSource)
           VALUES (?, ?, NULL, NULL, NULL, NULL, 'legacy')`,
          [track.albumId, track.id],
        );
      }
    }

    for (const relationship of backup.albumTracks ?? []) {
      await database.runAsync(
        `INSERT INTO AlbumTracks
           (albumId, trackId, discNumber, trackNumber, titleOverride, notes, orderSource)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(albumId, trackId) DO UPDATE SET
           discNumber = excluded.discNumber,
           trackNumber = excluded.trackNumber,
           titleOverride = excluded.titleOverride,
           notes = excluded.notes,
           orderSource = excluded.orderSource`,
        [
          relationship.albumTrackAlbumId,
          relationship.id,
          relationship.discNumber,
          relationship.trackNumber,
          relationship.titleOverride,
          relationship.notes,
          relationship.orderSource,
        ],
      );
    }

    for (const relationship of backup.artistRelationships ?? []) {
      await database.runAsync(
        `INSERT INTO ArtistRelationships
           (id, artistId, relatedArtistId, description, createdAt)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           artistId = excluded.artistId,
           relatedArtistId = excluded.relatedArtistId,
           description = excluded.description`,
        [
          relationship.id,
          relationship.artistId,
          relationship.relatedArtistId,
          relationship.description,
          relationship.createdAt,
        ],
      );
    }

    for (const relationship of validArtistAlbums) {
      await database.runAsync(
        `INSERT INTO ArtistAlbums (artistId, albumId, source, createdAt)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(artistId, albumId) DO UPDATE SET
           source = excluded.source,
           createdAt = excluded.createdAt`,
        [
          relationship.artistId,
          relationship.albumId,
          relationship.source,
          relationship.createdAt,
        ],
      );
    }

    for (const relationship of backup.personalRelationships) {
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
          relationship.trackId,
          relationship.rating,
          relationship.favorite ? 1 : 0,
          relationship.emotionalTags,
          relationship.personalNote,
        ],
      );
    }

    for (const entry of backup.journalEntries) {
      await database.runAsync(
        `INSERT INTO JournalEntries (id, trackId, note, mood, createdAt)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           trackId = excluded.trackId,
           note = excluded.note,
           mood = excluded.mood,
           createdAt = excluded.createdAt`,
        [entry.id, entry.trackId, entry.note, entry.mood, entry.createdAt],
      );
    }

    for (const entry of backup.listeningHistory) {
      await database.runAsync(
        `INSERT INTO ListeningHistory (id, trackId, listenedAt)
         VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           trackId = excluded.trackId,
           listenedAt = excluded.listenedAt`,
        [entry.id, entry.trackId, entry.listenedAt],
      );
    }

    for (const credit of backup.credits ?? []) {
      await database.runAsync(
        `INSERT INTO Credits
           (id, artistId, roleId, workId, trackId, albumId, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           artistId = excluded.artistId,
           roleId = excluded.roleId,
           workId = excluded.workId,
           trackId = excluded.trackId,
           albumId = excluded.albumId,
           notes = excluded.notes,
           updatedAt = excluded.updatedAt`,
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
    }
  });

  let missingAudioFiles: number | undefined;
  try {
    const audioStatuses = await Promise.all(
      backup.tracks
        .filter((track) => track.audioUri)
        .map((track) => audioFileExists(track.audioUri)),
    );
    missingAudioFiles = audioStatuses.filter((exists) => !exists).length;
  } catch {
    // A file status failure must not turn a successful restore into an error.
  }

  return {
    artists: backup.artists.length,
    albums: backup.albums.length,
    tracks: backup.tracks.length,
    personalRelationships: backup.personalRelationships.length,
    journalEntries: backup.journalEntries.length,
    listeningHistory: backup.listeningHistory.length,
    albumTracks: backup.albumTracks?.length ?? 0,
    works: backup.works?.length ?? 0,
    versions: backup.versions?.length ?? 0,
    roles: backup.roles?.length ?? 0,
    credits: backup.credits?.length ?? 0,
    artistRelationships: backup.artistRelationships?.length ?? 0,
    artistAlbums: validArtistAlbums.length,
    missingAudioFiles,
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
  const roles = parseRoles(parsed.roles);
  const credits = parseCredits(parsed.credits);
  const works = parseWorks(parsed.works);
  const versions = parseVersions(parsed.versions);
  const tracks = parseTracks(parsed.tracks);
  const personalRelationships = parseRelationships(parsed.personalRelationships);
  const journalEntries = parseJournalEntries(parsed.journalEntries);
  const listeningHistory = parseListeningHistory(parsed.listeningHistory);
  const albumTracks = parseAlbumTracks(parsed.albumTracks);
  const artistRelationships = parseArtistRelationships(parsed.artistRelationships);
  const artistAlbums = parseArtistAlbums(parsed.artistAlbums);

  assertUniqueIds(artists, 'هنرمندان');
  assertUniqueIds(albums, 'آلبوم‌ها');
  assertUniqueIds(roles, 'نقش‌ها');
  assertUniqueIds(credits, 'مشارکت‌ها');
  assertUniqueIds(works, 'آثار');
  assertUniqueIds(versions, 'نسخه‌ها');
  assertUniqueIds(tracks, 'قطعه‌ها');
  assertUniqueIds(personalRelationships, 'رابطه‌های شخصی', 'trackId');
  assertUniqueIds(journalEntries, 'یادداشت‌های دفترچه');
  assertUniqueIds(listeningHistory, 'تاریخچهٔ شنیدن');
  assertUniqueAlbumTrackMemberships(albumTracks);
  assertUniqueIds(artistRelationships, 'ارتباط‌های هنرمندان');
  assertUniqueArtistAlbumLinks(artistAlbums);
  assertUniqueCreditTargets(credits);

  return {
    format: 'naghme-archive',
    version: 1,
    exportedAt: requiredString(parsed.exportedAt, 'تاریخ خروجی'),
    artists,
    albums,
    roles,
    credits,
    works,
    versions,
    tracks,
    personalRelationships,
    journalEntries,
    listeningHistory,
    albumTracks,
    artistRelationships,
    artistAlbums,
  };
}

function parseArtistAlbums(
  value: unknown,
): ArtistAlbumBackupRecord[] {
  if (value === undefined) return [];
  return arrayValue(value, 'رابطه‌های هنرمند و آلبوم').map((item, index) => {
    const record = recordValue(item, `رابطهٔ هنرمند و آلبوم شمارهٔ ${index + 1}`);
    return {
      artistId: requiredString(record.artistId, 'شناسهٔ هنرمند در رابطهٔ آلبوم'),
      albumId: requiredString(record.albumId, 'شناسهٔ آلبوم در رابطهٔ هنرمند'),
      source: record.source === 'explicit' ? 'explicit' : 'inferred',
      createdAt: requiredString(record.createdAt, 'زمان ایجاد رابطهٔ هنرمند و آلبوم'),
    };
  });
}

function parseArtistRelationships(value: unknown): ArtistRelationshipRecord[] {
  if (value === undefined) return [];
  return arrayValue(value, 'ارتباط‌های هنرمندان').map((item, index) => {
    const record = recordValue(item, `ارتباط هنرمندان شمارهٔ ${index + 1}`);
    const artistId = requiredString(record.artistId, 'شناسهٔ هنرمند');
    const relatedArtistId = requiredString(record.relatedArtistId, 'شناسهٔ هنرمند مرتبط');
    if (artistId === relatedArtistId) throw new Error('ارتباط هنرمند با خودش معتبر نیست.');
    return {
      id: requiredString(record.id, 'شناسهٔ ارتباط هنرمندان'),
      artistId,
      relatedArtistId,
      relatedArtistName: nullableString(record.relatedArtistName, 'نام هنرمند مرتبط') ?? '',
      relatedArtistType: nullableString(record.relatedArtistType, 'نوع هنرمند مرتبط'),
      description: nullableString(record.description, 'توضیح ارتباط'),
      createdAt: requiredString(record.createdAt, 'زمان ایجاد ارتباط'),
    };
  });
}

function parseWorks(value: unknown): WorkRecord[] {
  if (value === undefined) return [];
  return arrayValue(value, 'آثار').map((item, index) => {
    const record = recordValue(item, `اثر شمارهٔ ${index + 1}`);
    return {
      id: requiredString(record.id, 'شناسهٔ اثر'),
      title: requiredString(record.title, 'عنوان اثر'),
      alternateTitles: nullableString(record.alternateTitles, 'عنوان‌های دیگر اثر'),
      description: nullableString(record.description, 'توضیح اثر'),
      language: nullableString(record.language, 'زبان اثر'),
      genre: nullableString(record.genre, 'گونهٔ اثر'),
      notes: nullableString(record.notes, 'یادداشت اثر'),
      createdAt: requiredString(record.createdAt, 'زمان ایجاد اثر'),
      updatedAt: requiredString(record.updatedAt, 'زمان ویرایش اثر'),
    };
  });
}

function parseRoles(value: unknown): RoleRecord[] {
  if (value === undefined) return [];
  return arrayValue(value, 'نقش‌ها').map((item, index) => {
    const record = recordValue(item, `نقش شمارهٔ ${index + 1}`);
    return {
      id: requiredString(record.id, 'شناسهٔ نقش'),
      name: requiredString(record.name, 'نام نقش'),
      key: requiredString(record.key, 'کلید نقش'),
      description: nullableString(record.description, 'توضیح نقش'),
    };
  });
}

function parseCredits(value: unknown): CreditRecord[] {
  if (value === undefined) return [];
  return arrayValue(value, 'مشارکت‌ها').map((item, index) => {
    const record = recordValue(item, `مشارکت شمارهٔ ${index + 1}`);
    return {
      id: requiredString(record.id, 'شناسهٔ مشارکت'),
      artistId: requiredString(record.artistId, 'شناسهٔ هنرمند مشارکت'),
      roleId: requiredString(record.roleId, 'شناسهٔ نقش مشارکت'),
      workId: nullableString(record.workId, 'شناسهٔ اثر مشارکت'),
      trackId: nullableString(record.trackId, 'شناسهٔ قطعهٔ مشارکت'),
      albumId: nullableString(record.albumId, 'شناسهٔ آلبوم مشارکت'),
      notes: nullableString(record.notes, 'یادداشت مشارکت'),
      createdAt: requiredString(record.createdAt, 'زمان ایجاد مشارکت'),
      updatedAt: requiredString(record.updatedAt, 'زمان ویرایش مشارکت'),
    };
  });
}

function parseVersions(value: unknown): VersionRecord[] {
  if (value === undefined) return [];
  return arrayValue(value, 'نسخه‌ها').map((item, index) => {
    const record = recordValue(item, `نسخهٔ شمارهٔ ${index + 1}`);
    return {
      id: requiredString(record.id, 'شناسهٔ نسخه'),
      workId: requiredString(record.workId, 'شناسهٔ اثر نسخه'),
      name: requiredString(record.name, 'نام نسخه'),
      kind: nullableString(record.kind, 'نوع نسخه'),
      description: nullableString(record.description, 'توضیح نسخه'),
      notes: nullableString(record.notes, 'یادداشت نسخه'),
      createdAt: requiredString(record.createdAt, 'زمان ایجاد نسخه'),
      updatedAt: requiredString(record.updatedAt, 'زمان ویرایش نسخه'),
    };
  });
}

function parseAlbumTracks(value: unknown): AlbumTrackRecord[] {
  if (value === undefined) return [];
  return arrayValue(value, 'رابطه‌های آلبوم و قطعه').map((item, index) => {
    const record = recordValue(item, `رابطهٔ آلبوم و قطعهٔ شمارهٔ ${index + 1}`);
    const discNumber = nullableInteger(record.discNumber, 'شمارهٔ دیسک');
    const trackNumber = nullableInteger(record.trackNumber, 'شمارهٔ قطعه');
    const hasDiscNumber = discNumber !== null;
    const hasTrackNumber = trackNumber !== null;
    if (hasDiscNumber !== hasTrackNumber) {
      throw new Error('شمارهٔ دیسک و قطعه در رابطهٔ آلبوم باید هر دو ثبت شوند یا هر دو خالی باشند.');
    }
    if (
      (discNumber !== null && discNumber < 1) ||
      (trackNumber !== null && trackNumber < 1)
    ) {
      throw new Error('شمارهٔ دیسک و قطعه باید عدد صحیح مثبت باشند.');
    }
    const orderSourceValue = record.orderSource;
    const orderSource: AlbumTrackRecord['orderSource'] =
      orderSourceValue === undefined ? (hasDiscNumber ? 'explicit' : 'unknown') :
      orderSourceValue === 'explicit' || orderSourceValue === 'legacy' || orderSourceValue === 'unknown'
        ? orderSourceValue
        : (() => {
            throw new Error('منبع ترتیب رابطهٔ آلبوم معتبر نیست.');
          })();
    if ((orderSource === 'explicit') !== hasDiscNumber) {
      throw new Error('منبع ترتیب رابطهٔ آلبوم با شماره‌های ثبت‌شده سازگار نیست.');
    }
    return {
      id: requiredString(record.id, 'شناسهٔ قطعه در رابطهٔ آلبوم'),
      title: requiredString(record.title, 'عنوان قطعه در رابطهٔ آلبوم'),
      duration: nullableInteger(record.duration, 'مدت‌زمان قطعه در رابطهٔ آلبوم'),
      artistId: nullableString(record.artistId, 'شناسهٔ هنرمند قطعه در رابطهٔ آلبوم'),
      albumId: nullableString(record.albumId, 'شناسهٔ آلبوم قطعه در رابطهٔ آلبوم'),
      audioUri: nullableString(record.audioUri, 'مسیر فایل صوتی رابطهٔ آلبوم'),
      coverImage: nullableString(record.coverImage, 'تصویر قطعه در رابطهٔ آلبوم'),
      lyrics: nullableString(record.lyrics, 'متن قطعه در رابطهٔ آلبوم'),
      sheetMusicUri: nullableString(record.sheetMusicUri, 'نت قطعه در رابطهٔ آلبوم'),
      versionName: nullableString(record.versionName, 'نسخهٔ قطعه در رابطهٔ آلبوم'),
      workId: nullableString(record.workId, 'شناسهٔ اثر قطعه در رابطهٔ آلبوم'),
      versionId: nullableString(record.versionId, 'شناسهٔ نسخهٔ قطعه در رابطهٔ آلبوم'),
      albumTrackAlbumId: requiredString(record.albumTrackAlbumId, 'شناسهٔ آلبوم در رابطه'),
      discNumber,
      trackNumber,
      titleOverride: nullableString(record.titleOverride, 'عنوان جایگزین قطعه'),
      notes: nullableString(record.notes, 'یادداشت رابطهٔ آلبوم'),
      orderSource,
    };
  });
}

function assertUniqueIds(
  records: Array<{ id?: string; trackId?: string | null }>,
  label: string,
  key: 'id' | 'trackId' = 'id',
): void {
  const seen = new Set<string>();
  for (const record of records) {
    const value = record[key];
    if (!value || seen.has(value)) {
      throw new Error(`${label} در فایل پشتیبان شناسهٔ تکراری دارد.`);
    }
    seen.add(value);
  }
}

function assertUniqueAlbumTrackMemberships(records: AlbumTrackRecord[]): void {
  const seen = new Set<string>();
  for (const record of records) {
    const key = `${record.albumTrackAlbumId}:${record.id}`;
    if (seen.has(key)) {
      throw new Error('رابطه‌های آلبوم و قطعه در فایل پشتیبان تکراری هستند.');
    }
    seen.add(key);
  }
}

function assertUniqueArtistAlbumLinks(
  records: Pick<ArtistAlbumBackupRecord, 'artistId' | 'albumId'>[],
): void {
  const seen = new Set<string>();
  for (const record of records) {
    const key = `${record.artistId}:${record.albumId}`;
    if (seen.has(key)) {
      throw new Error('رابطه‌های هنرمند و آلبوم در فایل پشتیبان تکراری هستند.');
    }
    seen.add(key);
  }
}

function assertUniqueCreditTargets(records: CreditRecord[]): void {
  const seen = new Set<string>();
  for (const record of records) {
    const targetCount = [record.workId, record.trackId, record.albumId].filter(
      (value) => value !== null,
    ).length;
    if (targetCount !== 1) {
      throw new Error('مشارکت‌های فایل پشتیبان باید دقیقاً یک مقصد داشته باشند.');
    }
    const target = record.workId ?? record.trackId ?? record.albumId;
    const key = `${record.artistId}:${record.roleId}:${target}`;
    if (seen.has(key)) {
      throw new Error('مشارکت‌های فایل پشتیبان تکراری هستند.');
    }
    seen.add(key);
  }
}

function parseJournalEntries(value: unknown): JournalEntryRecord[] {
  if (value === undefined) return [];
  return arrayValue(value, 'دفترچه‌ی خاطرات').map((item, index) => {
    const record = recordValue(item, `یادداشت دفترچه‌ی شماره‌ی ${index + 1}`);
    return {
      id: requiredString(record.id, 'شناسه‌ی یادداشت دفترچه'),
      trackId: requiredString(record.trackId, 'شناسه‌ی قطعه در دفترچه'),
      note: requiredString(record.note, 'متن یادداشت دفترچه'),
      mood: requiredString(record.mood, 'حال دفترچه'),
      createdAt: requiredString(record.createdAt, 'زمان یادداشت دفترچه'),
    };
  });
}

function parseListeningHistory(value: unknown): ListeningHistoryRecord[] {
  if (value === undefined) return [];
  return arrayValue(value, 'تاریخچه‌ی شنیدن').map((item, index) => {
    const record = recordValue(item, `مورد شنیدن شماره‌ی ${index + 1}`);
    return {
      id: requiredString(record.id, 'شناسه‌ی مورد شنیدن'),
      trackId: requiredString(record.trackId, 'شناسه‌ی قطعه در تاریخچه'),
      listenedAt: requiredString(record.listenedAt, 'زمان شنیدن'),
    };
  });
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
      profileImage: nullableString(record.profileImage, 'تصویر اصلی هنرمند'),
      galleryImages: nullableString(record.galleryImages, 'گالری تصاویر هنرمند'),
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
      artistId: nullableString(record.artistId, 'شناسه‌ی هنرمند قطعه'),
      albumId: nullableString(record.albumId, 'شناسه‌ی آلبوم قطعه'),
      audioUri: nullableString(record.audioUri, 'مسیر فایل صوتی'),
      coverImage: nullableString(record.coverImage, 'تصویر قطعه'),
      lyrics: nullableString(record.lyrics, 'متن ترانه'),
      sheetMusicUri: nullableString(record.sheetMusicUri, 'نت موسیقی'),
       versionName: nullableString(record.versionName, 'نسخه یا اجرا'),
       workId: nullableString(record.workId, 'شناسهٔ اثر قطعه'),
       versionId: nullableString(record.versionId, 'شناسهٔ نسخهٔ قطعه'),
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