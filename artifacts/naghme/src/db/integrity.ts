import type { SQLiteDatabase } from 'expo-sqlite';
import { CURRENT_SCHEMA_VERSION } from '@/src/db/migrations';

export interface IntegrityIssue {
  code: string;
  count: number;
}

export interface DatabaseIntegrityReport {
  ok: boolean;
  issues: IntegrityIssue[];
}

export const REQUIRED_INDEXES = [
  'idx_tracks_artist_title',
  'idx_tracks_album_title',
  'idx_tracks_title_nocase',
  'idx_album_tracks_album_order',
  'idx_album_tracks_track',
  'idx_album_tracks_album_position',
  'idx_tracks_work',
  'idx_tracks_version',
  'idx_versions_work',
  'idx_journal_track_created',
  'idx_journal_created',
  'idx_history_track_listened',
  'idx_history_listened',
  'idx_credits_artist',
  'idx_credits_role',
  'idx_credits_work',
  'idx_credits_track',
  'idx_credits_album',
  'idx_credits_unique_work',
  'idx_credits_unique_track',
  'idx_credits_unique_album',
  'idx_artist_relationships_artist',
  'idx_artist_relationships_related',
  'idx_artist_albums_artist',
  'idx_artist_albums_album',
] as const;

export async function runDatabaseIntegrityCheck(
  database: SQLiteDatabase,
): Promise<DatabaseIntegrityReport> {
  const checks: Array<Promise<IntegrityIssue>> = [
    countIssue(
      database,
      'orphaned_track_artist',
      `SELECT COUNT(*) AS count
       FROM Tracks
       LEFT JOIN Artists ON Artists.id = Tracks.artistId
       WHERE Tracks.artistId IS NOT NULL AND Artists.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_track_album',
      `SELECT COUNT(*) AS count
       FROM Tracks
       LEFT JOIN Albums ON Albums.id = Tracks.albumId
       WHERE Tracks.albumId IS NOT NULL AND Albums.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_album_track_album',
      `SELECT COUNT(*) AS count
       FROM AlbumTracks
       LEFT JOIN Albums ON Albums.id = AlbumTracks.albumId
       WHERE Albums.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_album_track_track',
      `SELECT COUNT(*) AS count
       FROM AlbumTracks
       LEFT JOIN Tracks ON Tracks.id = AlbumTracks.trackId
       WHERE Tracks.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_track_work',
      `SELECT COUNT(*) AS count
       FROM Tracks
       LEFT JOIN Works ON Works.id = Tracks.workId
       WHERE Tracks.workId IS NOT NULL AND Works.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_track_version',
      `SELECT COUNT(*) AS count
       FROM Tracks
       LEFT JOIN Versions ON Versions.id = Tracks.versionId
       WHERE Tracks.versionId IS NOT NULL AND Versions.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_version_work',
      `SELECT COUNT(*) AS count
       FROM Versions
       LEFT JOIN Works ON Works.id = Versions.workId
       WHERE Versions.workId IS NULL OR Works.id IS NULL`,
    ),
    countIssue(
      database,
      'invalid_track_version_work',
      `SELECT COUNT(*) AS count
       FROM Tracks
       INNER JOIN Versions ON Versions.id = Tracks.versionId
       WHERE Tracks.versionId IS NOT NULL
         AND Tracks.workId IS NOT NULL
         AND Versions.workId != Tracks.workId`,
    ),
    countIssue(
      database,
      'orphaned_credit_artist',
      `SELECT COUNT(*) AS count
       FROM Credits
       LEFT JOIN Artists ON Artists.id = Credits.artistId
       WHERE Credits.artistId IS NULL OR Artists.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_artist_relationship',
      `SELECT COUNT(*) AS count
       FROM ArtistRelationships
       LEFT JOIN Artists ON Artists.id = ArtistRelationships.artistId
       WHERE Artists.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_related_artist_relationship',
      `SELECT COUNT(*) AS count
       FROM ArtistRelationships
       LEFT JOIN Artists ON Artists.id = ArtistRelationships.relatedArtistId
       WHERE Artists.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_artist_album_artist',
      `SELECT COUNT(*) AS count
       FROM ArtistAlbums
       LEFT JOIN Artists ON Artists.id = ArtistAlbums.artistId
       WHERE Artists.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_artist_album_album',
      `SELECT COUNT(*) AS count
       FROM ArtistAlbums
       LEFT JOIN Albums ON Albums.id = ArtistAlbums.albumId
       WHERE Albums.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_credit_role',
      `SELECT COUNT(*) AS count
       FROM Credits
       LEFT JOIN Roles ON Roles.id = Credits.roleId
       WHERE Credits.roleId IS NULL OR Roles.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_credit_work',
      `SELECT COUNT(*) AS count
       FROM Credits
       LEFT JOIN Works ON Works.id = Credits.workId
       WHERE Credits.workId IS NOT NULL AND Works.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_credit_track',
      `SELECT COUNT(*) AS count
       FROM Credits
       LEFT JOIN Tracks ON Tracks.id = Credits.trackId
       WHERE Credits.trackId IS NOT NULL AND Tracks.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_credit_album',
      `SELECT COUNT(*) AS count
       FROM Credits
       LEFT JOIN Albums ON Albums.id = Credits.albumId
       WHERE Credits.albumId IS NOT NULL AND Albums.id IS NULL`,
    ),
    countIssue(
      database,
      'credit_without_target',
      `SELECT COUNT(*) AS count
       FROM Credits
       WHERE (workId IS NOT NULL) + (trackId IS NOT NULL) + (albumId IS NOT NULL) != 1`,
    ),
    countIssue(
      database,
      'invalid_credit_target',
      `SELECT COUNT(*) AS count
       FROM Credits
       WHERE (workId IS NOT NULL AND trackId IS NOT NULL)
          OR (workId IS NOT NULL AND albumId IS NOT NULL)
          OR (trackId IS NOT NULL AND albumId IS NOT NULL)`,
    ),
    countIssue(
      database,
      'duplicate_credit',
      `SELECT COUNT(*) AS count
       FROM (
         SELECT artistId, roleId, workId, trackId, albumId
         FROM Credits
         GROUP BY artistId, roleId, workId, trackId, albumId
         HAVING COUNT(*) > 1
       )`,
    ),
    countIssue(
      database,
      'invalid_album_track_order',
      `SELECT COUNT(*) AS count
       FROM AlbumTracks
       WHERE (discNumber IS NULL) != (trackNumber IS NULL)
          OR (discNumber IS NOT NULL AND (discNumber <= 0 OR trackNumber <= 0))`,
    ),
    countIssue(
      database,
      'duplicate_album_track_position',
      `SELECT COUNT(*) AS count
       FROM (
         SELECT albumId, discNumber, trackNumber
         FROM AlbumTracks
         WHERE discNumber IS NOT NULL AND trackNumber IS NOT NULL
         GROUP BY albumId, discNumber, trackNumber
         HAVING COUNT(*) > 1
       )`,
    ),
    countIssue(
      database,
      'orphaned_personal_relationship',
      `SELECT COUNT(*) AS count
       FROM PersonalRelationships
       LEFT JOIN Tracks ON Tracks.id = PersonalRelationships.trackId
       WHERE Tracks.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_journal_entry',
      `SELECT COUNT(*) AS count
       FROM JournalEntries
       LEFT JOIN Tracks ON Tracks.id = JournalEntries.trackId
       WHERE Tracks.id IS NULL`,
    ),
    countIssue(
      database,
      'orphaned_listening_history',
      `SELECT COUNT(*) AS count
       FROM ListeningHistory
       LEFT JOIN Tracks ON Tracks.id = ListeningHistory.trackId
       WHERE Tracks.id IS NULL`,
    ),
    countIssue(
      database,
      'duplicate_artist_id',
      'SELECT COUNT(*) AS count FROM (SELECT id FROM Artists GROUP BY id HAVING COUNT(*) > 1)',
    ),
    countIssue(
      database,
      'duplicate_album_id',
      'SELECT COUNT(*) AS count FROM (SELECT id FROM Albums GROUP BY id HAVING COUNT(*) > 1)',
    ),
    countIssue(
      database,
      'duplicate_track_id',
      'SELECT COUNT(*) AS count FROM (SELECT id FROM Tracks GROUP BY id HAVING COUNT(*) > 1)',
    ),
    countIssue(
      database,
      'duplicate_work_id',
      'SELECT COUNT(*) AS count FROM (SELECT id FROM Works GROUP BY id HAVING COUNT(*) > 1)',
    ),
    countIssue(
      database,
      'duplicate_version_id',
      'SELECT COUNT(*) AS count FROM (SELECT id FROM Versions GROUP BY id HAVING COUNT(*) > 1)',
    ),
    countIssue(
      database,
      'duplicate_role_id',
      'SELECT COUNT(*) AS count FROM (SELECT id FROM Roles GROUP BY id HAVING COUNT(*) > 1)',
    ),
    countIssue(
      database,
      'duplicate_credit_id',
      'SELECT COUNT(*) AS count FROM (SELECT id FROM Credits GROUP BY id HAVING COUNT(*) > 1)',
    ),
    countIssue(
      database,
      'duplicate_personal_relationship_track_id',
      `SELECT COUNT(*) AS count
       FROM (
         SELECT trackId
         FROM PersonalRelationships
         GROUP BY trackId
         HAVING COUNT(*) > 1
       )`,
    ),
    countIssue(
      database,
      'duplicate_journal_id',
      'SELECT COUNT(*) AS count FROM (SELECT id FROM JournalEntries GROUP BY id HAVING COUNT(*) > 1)',
    ),
    countIssue(
      database,
      'duplicate_history_id',
      'SELECT COUNT(*) AS count FROM (SELECT id FROM ListeningHistory GROUP BY id HAVING COUNT(*) > 1)',
    ),
    countIssue(
      database,
      'missing_artist_name',
      `SELECT COUNT(*) AS count FROM Artists
       WHERE name IS NULL OR trim(name) = ''`,
    ),
    countIssue(
      database,
      'missing_album_title',
      `SELECT COUNT(*) AS count FROM Albums
       WHERE title IS NULL OR trim(title) = ''`,
    ),
    countIssue(
      database,
      'missing_track_title',
      `SELECT COUNT(*) AS count FROM Tracks
       WHERE title IS NULL OR trim(title) = ''`,
    ),
    countIssue(
      database,
      'missing_work_required_fields',
      `SELECT COUNT(*) AS count FROM Works
       WHERE id IS NULL OR trim(id) = ''
          OR title IS NULL OR trim(title) = ''
          OR createdAt IS NULL OR trim(createdAt) = ''
          OR updatedAt IS NULL OR trim(updatedAt) = ''`,
    ),
    countIssue(
      database,
      'missing_version_required_fields',
      `SELECT COUNT(*) AS count FROM Versions
       WHERE id IS NULL OR trim(id) = ''
          OR workId IS NULL OR trim(workId) = ''
          OR name IS NULL OR trim(name) = ''
          OR createdAt IS NULL OR trim(createdAt) = ''
          OR updatedAt IS NULL OR trim(updatedAt) = ''`,
    ),
    countIssue(
      database,
      'missing_role_required_fields',
      `SELECT COUNT(*) AS count FROM Roles
       WHERE id IS NULL OR trim(id) = ''
          OR name IS NULL OR trim(name) = ''
          OR key IS NULL OR trim(key) = ''`,
    ),
    countIssue(
      database,
      'missing_credit_required_fields',
      `SELECT COUNT(*) AS count FROM Credits
       WHERE id IS NULL OR trim(id) = ''
          OR artistId IS NULL OR trim(artistId) = ''
          OR roleId IS NULL OR trim(roleId) = ''
          OR createdAt IS NULL OR trim(createdAt) = ''
          OR updatedAt IS NULL OR trim(updatedAt) = ''`,
    ),
    countIssue(
      database,
      'missing_personal_relationship_track_id',
      `SELECT COUNT(*) AS count FROM PersonalRelationships
       WHERE trackId IS NULL OR trim(trackId) = ''`,
    ),
    countIssue(
      database,
      'missing_journal_required_fields',
      `SELECT COUNT(*) AS count FROM JournalEntries
       WHERE trackId IS NULL OR trim(trackId) = ''
          OR note IS NULL OR trim(note) = ''
          OR mood IS NULL OR trim(mood) = ''
          OR createdAt IS NULL OR trim(createdAt) = ''`,
    ),
    countIssue(
      database,
      'missing_history_required_fields',
      `SELECT COUNT(*) AS count FROM ListeningHistory
       WHERE trackId IS NULL OR trim(trackId) = ''
          OR listenedAt IS NULL OR trim(listenedAt) = ''`,
    ),
  ];

  const issues = (await Promise.all(checks)).filter((issue) => issue.count > 0);
  const foreignKeyViolations = await database.getAllAsync<{ table: string }>(
    'PRAGMA foreign_key_check',
  );
  if (foreignKeyViolations.length) {
    issues.push({
      code: 'foreign_key_check',
      count: foreignKeyViolations.length,
    });
  }

  const foreignKeyState = await database.getFirstAsync<{ foreign_keys: number }>(
    'PRAGMA foreign_keys',
  );
  if (foreignKeyState?.foreign_keys !== 1) {
    issues.push({ code: 'foreign_keys_disabled', count: 1 });
  }

  const schemaVersion = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  if (schemaVersion?.user_version !== CURRENT_SCHEMA_VERSION) {
    issues.push({ code: 'unexpected_schema_version', count: 1 });
  }

  const indexes = await database.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type = 'index' AND name NOT LIKE 'sqlite_%'`,
  );
  const indexNames = new Set(indexes.map((index) => index.name));
  for (const index of REQUIRED_INDEXES) {
    if (!indexNames.has(index)) {
      issues.push({ code: `missing_index:${index}`, count: 1 });
    }
  }

  return { ok: issues.length === 0, issues };
}

async function countIssue(
  database: SQLiteDatabase,
  code: string,
  query: string,
): Promise<IntegrityIssue> {
  const row = await database.getFirstAsync<{ count: number }>(query);
  return { code, count: Number(row?.count ?? 0) };
}