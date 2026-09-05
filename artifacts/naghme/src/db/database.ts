import { Platform } from 'react-native';
import { SQLiteDatabase, openDatabaseAsync } from 'expo-sqlite';
import { migrateDatabase } from '@/src/db/migrations';
import { verifyDatabaseFoundation } from '@/src/db/verification';

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
    profileImage TEXT,
    galleryImages TEXT,
    alternateTitles TEXT,
    source TEXT
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
    durationSeconds REAL,
    completionPercent REAL,
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
        await database.execAsync('PRAGMA foreign_keys = ON;');
        const foreignKeyState = await database.getFirstAsync<{ foreign_keys: number }>(
          'PRAGMA foreign_keys',
        );
        if (foreignKeyState?.foreign_keys !== 1) {
          throw new Error('فعال‌سازی یکپارچگی رابطه‌های SQLite انجام نشد.');
        }

        await database.execAsync(schema);

        await migrateDatabase(database);

        if (__DEV__) {
          try {
            const report = await verifyDatabaseFoundation(database);
            if (!report.ok) {
              console.warn('Naghme database integrity check found issues', report);
            }
          } catch (error: unknown) {
            console.warn('Naghme database integrity check failed', error);
          }
        }

        return database;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        if (__DEV__) {
          console.error('Naghme database initialization failed', error);
        }
        throw error;
      });
  }

  return databasePromise;
}

export async function getDatabase(): Promise<SQLiteDatabase | null> {
  return initializeDatabase();
}