import { Platform } from 'react-native';
import { SQLiteDatabase, openDatabaseAsync } from 'expo-sqlite';

let databasePromise: Promise<SQLiteDatabase | null> | null = null;

const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS Artists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    biography TEXT,
    genres TEXT,
    image TEXT,
    galleryImages TEXT
  );

  CREATE TABLE IF NOT EXISTS Albums (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    releaseYear INTEGER,
    coverImage TEXT
  );

  CREATE TABLE IF NOT EXISTS Tracks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    duration INTEGER,
    artistId TEXT,
    albumId TEXT,
    audioUri TEXT,
    coverImage TEXT,
    lyrics TEXT,
    sheetMusicUri TEXT,
    versionName TEXT,
    FOREIGN KEY (artistId) REFERENCES Artists(id) ON DELETE SET NULL,
    FOREIGN KEY (albumId) REFERENCES Albums(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS PersonalRelationships (
    trackId TEXT PRIMARY KEY NOT NULL,
    rating REAL,
    favorite INTEGER NOT NULL DEFAULT 0,
    emotionalTags TEXT,
    personalNote TEXT,
    listeningCount INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (trackId) REFERENCES Tracks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS JournalEntries (
    id TEXT PRIMARY KEY NOT NULL,
    trackId TEXT NOT NULL,
    note TEXT NOT NULL,
    mood TEXT NOT NULL,
    createdAt DATETIME NOT NULL,
    FOREIGN KEY (trackId) REFERENCES Tracks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ListeningHistory (
    id TEXT PRIMARY KEY NOT NULL,
    trackId TEXT NOT NULL,
    listenedAt DATETIME NOT NULL,
    FOREIGN KEY (trackId) REFERENCES Tracks(id) ON DELETE CASCADE
  );
`;

export async function initializeDatabase(): Promise<SQLiteDatabase | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!databasePromise) {
    databasePromise = openDatabaseAsync('naghme.db')
      .then(async (database) => {
        await database.execAsync(schema);
        const tables = [
          {
            name: 'Artists',
            columns: [
              ['galleryImages', 'TEXT'],
            ],
          },
          {
            name: 'Albums',
            columns: [
              ['coverImage', 'TEXT'],
            ],
          },
          {
            name: 'Tracks',
            columns: [
              ['artistId', 'TEXT'],
              ['lyrics', 'TEXT'],
              ['sheetMusicUri', 'TEXT'],
              ['versionName', 'TEXT'],
            ],
          },
        ] as const;

        for (const table of tables) {
          const columns = await database.getAllAsync<{ name: string }>(
            `PRAGMA table_info(${table.name})`,
            [],
          );
          for (const [name, type] of table.columns) {
            if (!columns.some((column) => column.name === name)) {
              try {
                await database.execAsync(`ALTER TABLE ${table.name} ADD COLUMN ${name} ${type};`);
              } catch {
                // A concurrent/previous migration may have added the column already.
              }
            }
          }
        }
        return database;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
}

export async function getDatabase(): Promise<SQLiteDatabase | null> {
  return initializeDatabase();
}