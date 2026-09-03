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