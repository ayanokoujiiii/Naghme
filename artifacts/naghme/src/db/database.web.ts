/**
 * The native SQLite driver is intentionally not bundled into the web preview.
 * Native builds resolve database.ts, while web gets this safe no-op adapter.
 */
export async function initializeDatabase(): Promise<null> {
  return null;
}

export async function getDatabase(): Promise<null> {
  return null;
}