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
    image TEXT
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
    albumId TEXT,
    audioUri TEXT,
    coverImage TEXT,
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