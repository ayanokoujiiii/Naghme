import type { SQLiteDatabase } from 'expo-sqlite';

export const CURRENT_SCHEMA_VERSION = 5;

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
  {
    version: 3,
    description: 'افزودن رابطهٔ پایدار و مرتب‌شدهٔ آلبوم و قطعه',
    migrate: addAlbumTracksRelationship,
  },
  {
    version: 4,
    description: 'افزودن پایهٔ Work و Version بدون تغییر داده‌های موجود',
    migrate: addWorkVersionFoundation,
  },
  {
    version: 5,
    description: 'افزودن مدل عمومی نقش‌ها و مشارکت‌های هنری',
    migrate: addRolesAndCredits,
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
  // These indexes support relation filters and ordered/prefix lookups.
  // They do not make arbitrary LIKE '%term%' substring searches fast.
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

async function addAlbumTracksRelationship(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS AlbumTracks (
      albumId TEXT NOT NULL,
      trackId TEXT NOT NULL,
      discNumber INTEGER,
      trackNumber INTEGER,
      titleOverride TEXT,
      notes TEXT,
      orderSource TEXT NOT NULL DEFAULT 'unknown'
        CHECK (orderSource IN ('explicit', 'legacy', 'unknown')),
      PRIMARY KEY (albumId, trackId),
      FOREIGN KEY (albumId) REFERENCES Albums(id) ON DELETE CASCADE,
      FOREIGN KEY (trackId) REFERENCES Tracks(id) ON DELETE CASCADE,
      CHECK (
        (discNumber IS NULL AND trackNumber IS NULL)
        OR (discNumber IS NOT NULL AND trackNumber IS NOT NULL
          AND discNumber > 0 AND trackNumber > 0)
      )
    );

    CREATE INDEX IF NOT EXISTS idx_album_tracks_album_order
      ON AlbumTracks (albumId, discNumber, trackNumber);

    CREATE INDEX IF NOT EXISTS idx_album_tracks_track
      ON AlbumTracks (trackId);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_album_tracks_album_position
      ON AlbumTracks (albumId, discNumber, trackNumber)
      WHERE discNumber IS NOT NULL AND trackNumber IS NOT NULL;
  `);

  // The legacy Tracks.albumId column remains untouched. These rows preserve
  // membership without pretending that an official track order was known.
  await database.runAsync(
    `INSERT OR IGNORE INTO AlbumTracks
       (albumId, trackId, discNumber, trackNumber, titleOverride, notes, orderSource)
     SELECT albumId, id, NULL, NULL, NULL, NULL, 'legacy'
     FROM Tracks
     WHERE albumId IS NOT NULL`,
  );
}

async function addWorkVersionFoundation(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS Works (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      alternateTitles TEXT,
      description TEXT,
      language TEXT,
      genre TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Versions (
      id TEXT PRIMARY KEY NOT NULL,
      workId TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT,
      description TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (workId) REFERENCES Works(id) ON DELETE RESTRICT
    );
  `);

  const trackColumns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(Tracks)',
  );
  const existingTrackColumns = new Set(trackColumns.map((column) => column.name));
  if (!existingTrackColumns.has('workId')) {
    await database.execAsync(
      'ALTER TABLE Tracks ADD COLUMN workId TEXT REFERENCES Works(id) ON DELETE SET NULL;',
    );
  }
  if (!existingTrackColumns.has('versionId')) {
    await database.execAsync(
      'ALTER TABLE Tracks ADD COLUMN versionId TEXT REFERENCES Versions(id) ON DELETE SET NULL;',
    );
  }

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_tracks_work
      ON Tracks (workId);

    CREATE INDEX IF NOT EXISTS idx_tracks_version
      ON Tracks (versionId);

    CREATE INDEX IF NOT EXISTS idx_versions_work
      ON Versions (workId);
  `);
}

async function addRolesAndCredits(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS Roles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS Credits (
      id TEXT PRIMARY KEY NOT NULL,
      artistId TEXT NOT NULL,
      roleId TEXT NOT NULL,
      workId TEXT,
      trackId TEXT,
      albumId TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (artistId) REFERENCES Artists(id) ON DELETE RESTRICT,
      FOREIGN KEY (roleId) REFERENCES Roles(id) ON DELETE RESTRICT,
      FOREIGN KEY (workId) REFERENCES Works(id) ON DELETE RESTRICT,
      FOREIGN KEY (trackId) REFERENCES Tracks(id) ON DELETE RESTRICT,
      FOREIGN KEY (albumId) REFERENCES Albums(id) ON DELETE RESTRICT,
      CHECK (
        (workId IS NOT NULL) + (trackId IS NOT NULL) + (albumId IS NOT NULL) = 1
      )
    );

    CREATE INDEX IF NOT EXISTS idx_credits_artist ON Credits (artistId);
    CREATE INDEX IF NOT EXISTS idx_credits_role ON Credits (roleId);
    CREATE INDEX IF NOT EXISTS idx_credits_work ON Credits (workId);
    CREATE INDEX IF NOT EXISTS idx_credits_track ON Credits (trackId);
    CREATE INDEX IF NOT EXISTS idx_credits_album ON Credits (albumId);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_credits_unique_work
      ON Credits (artistId, roleId, workId)
      WHERE workId IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credits_unique_track
      ON Credits (artistId, roleId, trackId)
      WHERE trackId IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credits_unique_album
      ON Credits (artistId, roleId, albumId)
      WHERE albumId IS NOT NULL;
  `);

  await database.execAsync(`
    INSERT OR IGNORE INTO Roles (id, name, key, description) VALUES
      ('role_vocalist', 'خواننده', 'vocalist', 'اجرای آوازی یا خوانندگی'),
      ('role_composer', 'آهنگساز', 'composer', 'ساخت یا تصنیف موسیقی'),
      ('role_lyricist', 'ترانه‌سرا', 'lyricist', 'نوشتن متن یا شعر'),
      ('role_arranger', 'تنظیم‌کننده', 'arranger', 'تنظیم یا بازآفرینی موسیقی'),
      ('role_musician', 'نوازنده', 'musician', 'نواختن ساز'),
      ('role_conductor', 'رهبر', 'conductor', 'رهبری اجرا یا گروه'),
      ('role_ensemble', 'گروه / ارکستر', 'ensemble', 'همکاری گروهی یا ارکسترال'),
      ('role_producer', 'تهیه‌کننده', 'producer', 'تهیه یا تولید اثر'),
      ('role_other', 'مشارکت‌کنندهٔ دیگر', 'other', 'نقشی که در فهرست پایه نیست');
  `);
}