import type { SQLiteDatabase } from 'expo-sqlite';

export const CURRENT_SCHEMA_VERSION = 2;

export interface AppliedMigration {
  version: number;
  description: string;
}

export interface MigrationResult {
  fromVersion: number;
  toVersion: number;
  applied: AppliedMigration[];
}

type Migration = AppliedMigration & {
  migrate: (database: SQLiteDatabase) => Promise<void>;
};

const BASELINE_TABLES: ReadonlyArray<{
  name: string;
  requiredColumns: readonly string[];
  columns: ReadonlyArray<readonly [string, string]>;
}> = [
  {
    name: 'Artists',
    requiredColumns: ['id', 'name'],
    columns: [
      ['type', 'TEXT'],
      ['biography', 'TEXT'],
      ['genres', 'TEXT'],
      ['image', 'TEXT'],
      ['profileImage', 'TEXT'],
      ['galleryImages', 'TEXT'],
    ],
  },
  {
    name: 'Albums',
    requiredColumns: ['id', 'title'],
    columns: [
      ['releaseYear', 'INTEGER'],
      ['coverImage', 'TEXT'],
    ],
  },
  {
    name: 'Tracks',
    requiredColumns: ['id', 'title'],
    columns: [
      ['duration', 'INTEGER'],
      ['artistId', 'TEXT'],
      ['albumId', 'TEXT'],
      ['audioUri', 'TEXT'],
      ['coverImage', 'TEXT'],
      ['lyrics', 'TEXT'],
      ['sheetMusicUri', 'TEXT'],
      ['versionName', 'TEXT'],
    ],
  },
  {
    name: 'PersonalRelationships',
    requiredColumns: ['trackId'],
    columns: [
      ['rating', 'REAL'],
      ['favorite', 'INTEGER NOT NULL DEFAULT 0'],
      ['emotionalTags', 'TEXT'],
      ['personalNote', 'TEXT'],
      ['listeningCount', 'INTEGER NOT NULL DEFAULT 0'],
    ],
  },
  {
    name: 'JournalEntries',
    requiredColumns: ['id', 'trackId', 'note', 'mood', 'createdAt'],
    columns: [],
  },
  {
    name: 'ListeningHistory',
    requiredColumns: ['id', 'trackId', 'listenedAt'],
    columns: [],
  },
];

const migrations: readonly Migration[] = [
  {
    version: 1,
    description: 'ثبت baseline سازگار با نصب‌های قدیمی نغمه',
    migrate: ensureBaselineSchema,
  },
  {
    version: 2,
    description: 'افزودن indexهای موردنیاز queryهای فعلی',
    migrate: addQueryIndexes,
  },
];

export async function getSchemaVersion(database: SQLiteDatabase): Promise<number> {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version;
  if (version === undefined || !Number.isInteger(version) || version < 0) {
    throw new Error('نسخهٔ SQLite نغمه قابل خواندن نیست.');
  }
  return version;
}

export async function migrateDatabase(database: SQLiteDatabase): Promise<MigrationResult> {
  const fromVersion = await getSchemaVersion(database);
  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `نسخهٔ دیتابیس (${fromVersion}) از نسخهٔ برنامه (${CURRENT_SCHEMA_VERSION}) جدیدتر است.`,
    );
  }

  const applied: AppliedMigration[] = [];
  for (const migration of migrations) {
    if (migration.version <= fromVersion) continue;

    if (__DEV__) {
      console.info(
        `[Naghme database] migration ${migration.version}: ${migration.description}`,
      );
    }

    try {
      await database.withTransactionAsync(async () => {
        await migration.migrate(database);
        await database.execAsync(`PRAGMA user_version = ${migration.version};`);
      });
      applied.push({
        version: migration.version,
        description: migration.description,
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(
        `[Naghme database] migration ${migration.version} failed: ${migration.description}`,
        detail,
      );
      throw new Error(`مهاجرت دیتابیس در نسخهٔ ${migration.version} انجام نشد: ${detail}`);
    }
  }

  const toVersion = await getSchemaVersion(database);
  if (toVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `نسخهٔ دیتابیس پس از migration برابر ${toVersion} است؛ انتظار ${CURRENT_SCHEMA_VERSION} می‌رفت.`,
    );
  }

  return { fromVersion, toVersion, applied };
}

async function ensureBaselineSchema(database: SQLiteDatabase): Promise<void> {
  for (const table of BASELINE_TABLES) {
    const columns = await database.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${table.name})`,
    );
    if (!columns.length) {
      throw new Error(`جدول پایهٔ ${table.name} پیدا نشد.`);
    }

    const existingColumns = new Set(columns.map((column) => column.name));
    const missingRequired = table.requiredColumns.filter((column) => !existingColumns.has(column));
    if (missingRequired.length) {
      throw new Error(
        `جدول ${table.name} ستون پایهٔ ضروری ندارد: ${missingRequired.join(', ')}.`,
      );
    }

    for (const [name, definition] of table.columns) {
      if (existingColumns.has(name)) continue;
      await database.execAsync(`ALTER TABLE ${table.name} ADD COLUMN ${name} ${definition};`);
    }
  }
}

async function addQueryIndexes(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_tracks_artist_title
      ON Tracks (artistId, title COLLATE NOCASE);

    CREATE INDEX IF NOT EXISTS idx_tracks_album_title
      ON Tracks (albumId, title COLLATE NOCASE);

    CREATE INDEX IF NOT EXISTS idx_tracks_title_nocase
      ON Tracks (title COLLATE NOCASE);

    CREATE INDEX IF NOT EXISTS idx_journal_track_created
      ON JournalEntries (trackId, createdAt DESC);

    CREATE INDEX IF NOT EXISTS idx_journal_created
      ON JournalEntries (createdAt DESC);

    CREATE INDEX IF NOT EXISTS idx_history_track_listened
      ON ListeningHistory (trackId, listenedAt DESC);

    CREATE INDEX IF NOT EXISTS idx_history_listened
      ON ListeningHistory (listenedAt DESC);
  `);
}