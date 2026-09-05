import * as FileSystem from 'expo-file-system/legacy';

const AUDIO_DIRECTORY_NAME = 'naghme-audio';

function getAudioDirectory(): string {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error('فضای ذخیره‌سازی دائمی فایل صوتی در دسترس نیست.');
  }
  return `${documentDirectory}${AUDIO_DIRECTORY_NAME}/`;
}

function isFileUri(uri: string): boolean {
  return uri.startsWith('file://');
}

function getExtension(uri: string): string {
  const withoutQuery = uri.split(/[?#]/, 1)[0];
  const extension = withoutQuery.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'audio';
}

export function isLocalAudioUri(uri: string | null): boolean {
  return Boolean(uri && isFileUri(uri));
}

export async function audioFileExists(uri: string | null): Promise<boolean> {
  if (!uri || !isFileUri(uri)) return true;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
}

export async function copyAudioToPermanent(uri: string, trackId: string): Promise<string> {
  return copyUriToPermanent(uri, AUDIO_DIRECTORY_NAME, trackId, getExtension(uri));
}

export async function copyUriToPermanent(
  uri: string,
  directoryName: string,
  fileKey: string,
  extension = getExtension(uri),
): Promise<string> {
  if (!isFileUri(uri)) return uri;

  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    throw new Error('فضای ذخیره‌سازی دائمی فایل در دسترس نیست.');
  }
  const directory = `${documentDirectory}${directoryName}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${fileKey}.${extension}`;
  if (uri === destination) return uri;

  const destinationInfo = await FileSystem.getInfoAsync(destination);
  if (!destinationInfo.exists) {
    await FileSystem.copyAsync({ from: uri, to: destination });
  }
  return destination;
}

export async function migrateCachedAudioFile(
  uri: string | null,
  trackId: string,
): Promise<string | null> {
  if (!uri || !isFileUri(uri)) return uri;
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory || !uri.startsWith(cacheDirectory)) return uri;
  return copyAudioToPermanent(uri, trackId);
}

export async function migrateCachedAudioFiles(
  tracks: Array<{ id: string; audioUri: string | null }>,
): Promise<Array<{ id: string; audioUri: string }>> {
  const migrated: Array<{ id: string; audioUri: string }> = [];
  for (const track of tracks) {
    try {
      const nextUri = await migrateCachedAudioFile(track.audioUri, track.id);
      if (nextUri && nextUri !== track.audioUri) {
        migrated.push({ id: track.id, audioUri: nextUri });
      }
    } catch {
      // A deleted legacy cache file stays addressable so the UI can offer re-selection.
    }
  }
  return migrated;
}

export async function deleteAudioFile(uri: string | null): Promise<void> {
  if (!uri || !isFileUri(uri)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}