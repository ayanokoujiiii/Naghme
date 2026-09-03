import type { SQLiteDatabase } from 'expo-sqlite';

export interface IntegrityIssue {
  code: string;
  count: number;
}

export interface DatabaseIntegrityReport {
  ok: boolean;
  issues: IntegrityIssue[];
}

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