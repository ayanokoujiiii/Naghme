import { getDatabase } from '@/src/db/database';

export interface ArchiveBackup {
  format: 'naghme-archive';
  version: 1;
  exportedAt: string;
  artists: unknown[];
  albums: unknown[];
  tracks: unknown[];
  personalRelationships: unknown[];
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
    database.getAllAsync('SELECT * FROM Artists ORDER BY rowid ASC', []),
    database.getAllAsync('SELECT * FROM Albums ORDER BY rowid ASC', []),
    database.getAllAsync('SELECT * FROM Tracks ORDER BY rowid ASC', []),
    database.getAllAsync('SELECT * FROM PersonalRelationships ORDER BY rowid ASC', []),
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