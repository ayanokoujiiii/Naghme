import type { SQLiteDatabase } from 'expo-sqlite';
import { CURRENT_SCHEMA_VERSION, getSchemaVersion } from '@/src/db/migrations';
import {
  REQUIRED_INDEXES,
  runDatabaseIntegrityCheck,
  type DatabaseIntegrityReport,
} from '@/src/db/integrity';

export interface FoundationVerificationReport {
  ok: boolean;
  schemaVersion: number;
  foreignKeysEnabled: boolean;
  integrity: DatabaseIntegrityReport;
  missingIndexes: string[];
}

/**
 * Deterministic development check for the stability foundation.
 * It reports problems and never deletes or repairs user data.
 */
export async function verifyDatabaseFoundation(
  database: SQLiteDatabase,
): Promise<FoundationVerificationReport> {
  const [schemaVersion, foreignKeyRow, indexes, integrity] = await Promise.all([
    getSchemaVersion(database),
    database.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys'),
    database.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'index' AND name NOT LIKE 'sqlite_%'`,
    ),
    runDatabaseIntegrityCheck(database),
  ]);

  const indexNames = new Set(indexes.map((index) => index.name));
  const missingIndexes = REQUIRED_INDEXES.filter((index) => !indexNames.has(index));
  const foreignKeysEnabled = foreignKeyRow?.foreign_keys === 1;

  return {
    ok:
      schemaVersion === CURRENT_SCHEMA_VERSION &&
      foreignKeysEnabled &&
      integrity.ok &&
      missingIndexes.length === 0,
    schemaVersion,
    foreignKeysEnabled,
    integrity,
    missingIndexes,
  };
}