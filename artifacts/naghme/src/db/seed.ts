import { getDatabase } from '@/src/db/database';
import { AlbumRecord, ArtistRecord, TrackRecord } from '@/src/db/queries';

export const SAMPLE_ARTIST_IDS = {
  shajarian: 'sample_artist_shajarian',
  kalhor: 'sample_artist_kalhor',
  alizadeh: 'sample_artist_alizadeh',
} as const;

export const SAMPLE_ALBUM_IDS = {
  bidad: 'sample_album_bidad',
  shabSokoutKavir: 'sample_album_shab_sokout_kavir',
} as const;

export const SAMPLE_TRACK_IDS = {
  tasnifBidad: 'sample_track_tasnif_bidad',
  baroun: 'sample_track_baroun',
  khaneh: 'sample_track_khaneh',
  shabSokoutKavir: 'sample_track_shab_sokout_kavir',
} as const;

export interface SeedArtistAlbumLink {
  artistId: string;
  albumId: string;
}

/**
 * Seed-only catalogue input. The graph reads ArtistAlbums from SQLite; this
 * list is used only when the user explicitly injects the sample catalogue.
 */
export const SAMPLE_ARTIST_ALBUM_LINKS: readonly SeedArtistAlbumLink[] = [
  {
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    albumId: SAMPLE_ALBUM_IDS.bidad,
  },
  {
    artistId: SAMPLE_ARTIST_IDS.kalhor,
    albumId: SAMPLE_ALBUM_IDS.shabSokoutKavir,
  },
];

const SAMPLE_ARTISTS: Array<ArtistRecord> = [
  {
    id: SAMPLE_ARTIST_IDS.shajarian,
    name: 'محمدرضا شجریان',
    type: 'خواننده و استاد آواز',
    biography:
      'محمدرضا شجریان از برجسته‌ترین خوانندگان موسیقی سنتی ایران بود. او با تسلط بر ردیف آوازی و اجرای تصنیف‌های ماندگار، نقش مهمی در پیوند موسیقی دستگاهی با مخاطب امروز داشت.',
    genres: 'موسیقی دستگاهی، آواز ایرانی',
    image:
      'https://upload.wikimedia.org/wikipedia/commons/8/88/Mohamdreza_Shajarian_1.jpg',
    profileImage: null,
    galleryImages: null,
  },
  {
    id: SAMPLE_ARTIST_IDS.kalhor,
    name: 'کیهان کلهر',
    type: 'کمانچه‌نواز و آهنگساز',
    biography:
      'کیهان کلهر آهنگساز و نوازندهٔ نامدار کمانچه است. آثار او ریشه‌های موسیقی ایرانی را با بداهه‌نوازی و گفت‌وگوی موسیقایی میان فرهنگ‌ها همراه می‌کند.',
    genres: 'موسیقی ایرانی، موسیقی تلفیقی',
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Kayhan_Kalhor.jpg',
    profileImage: null,
    galleryImages: null,
  },
  {
    id: SAMPLE_ARTIST_IDS.alizadeh,
    name: 'حسین علیزاده',
    type: 'آهنگساز و نوازندهٔ تار',
    biography:
      'حسین علیزاده آهنگساز، پژوهشگر و نوازندهٔ تار و سه‌تار است. او با آفرینش قطعات ماندگار و موسیقی فیلم، از چهره‌های اثرگذار موسیقی معاصر ایران به شمار می‌رود.',
    genres: 'موسیقی دستگاهی، موسیقی فیلم',
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Hosein_alizadeh2.jpg',
    profileImage: null,
    galleryImages: null,
  },
];

const SAMPLE_ALBUMS: Array<AlbumRecord> = [
  {
    id: SAMPLE_ALBUM_IDS.bidad,
    title: 'بیداد',
    releaseYear: 1989,
    coverImage:
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: SAMPLE_ALBUM_IDS.shabSokoutKavir,
    title: 'شب، سکوت، کویر',
    releaseYear: 2001,
    coverImage:
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80',
  },
];

const SAMPLE_AUDIO_URI = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

const SAMPLE_TRACKS: Array<TrackRecord> = [
  {
    id: SAMPLE_TRACK_IDS.tasnifBidad,
    title: 'تصنیف بیداد',
    duration: 356,
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    albumId: SAMPLE_ALBUM_IDS.bidad,
    audioUri: SAMPLE_AUDIO_URI,
    coverImage: SAMPLE_ALBUMS[0].coverImage,
    lyrics:
      'در کوچه‌های خاموش شب، آواز دوری مانده است\n' +
      'بر شانه‌های خسته‌ام، عطر عبوری مانده است\n\n' +
      'ای پنجره، ای صبح روشن، از قصه‌هایم کم نکن\n' +
      'این دل اگر بیدار مانده، با یاد او آرام کن\n\n' +
      'هر جا که باران می‌زند، نام تو در من تازه است\n' +
      'بیداد اگرچه تلخ بود، پایان این آواز نیست',
    sheetMusicUri: null,
    versionName: 'اجرای نمونهٔ استودیویی',
    workId: null,
    versionId: null,
  },
  {
    id: SAMPLE_TRACK_IDS.baroun,
    title: 'بارون',
    duration: 287,
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    albumId: SAMPLE_ALBUM_IDS.bidad,
    audioUri: SAMPLE_AUDIO_URI,
    coverImage: SAMPLE_ALBUMS[0].coverImage,
    lyrics:
      'باران که می‌گیرد، خیابان بوی تو را می‌دهد\n' +
      'هر قطره روی شیشه، از رفتنت خبر می‌دهد\n\n' +
      'من مانده‌ام با چتری از خاطره‌های خیس و دور\n' +
      'با یک ترانه در گلو، با یک نگاه از پشت نور\n\n' +
      'باران ببار آرام‌تر، این خانه خوابش می‌برد\n' +
      'شاید دل دیوانه‌ام امشب تو را باور کند',
    sheetMusicUri: null,
    versionName: 'بازخوانی آرام',
    workId: null,
    versionId: null,
  },
  {
    id: SAMPLE_TRACK_IDS.khaneh,
    title: 'خانه‌ام ابری است',
    duration: 318,
    artistId: SAMPLE_ARTIST_IDS.alizadeh,
    albumId: SAMPLE_ALBUM_IDS.shabSokoutKavir,
    audioUri: SAMPLE_AUDIO_URI,
    coverImage: SAMPLE_ALBUMS[1].coverImage,
    lyrics:
      'خانه‌ام ابری‌ست اما پنجره رو به سحر دارد\n' +
      'در اتاقی دور و خاموش، شعله‌ای از سفر دارد\n\n' +
      'می‌روم تا پشت این دیوار، جایی از باران بگذرم\n' +
      'از میان کوچه‌های خیس، سمت یک رؤیا بگذرم\n\n' +
      'ابرها می‌گذرند آخر، آسمان سهم من است\n' +
      'خانه گر ابری‌ست، در من روشنای دیگری‌ست',
    sheetMusicUri: null,
    versionName: 'تنظیم مجلسی',
    workId: null,
    versionId: null,
  },
  {
    id: SAMPLE_TRACK_IDS.shabSokoutKavir,
    title: 'شب، سکوت، کویر',
    duration: 402,
    artistId: SAMPLE_ARTIST_IDS.kalhor,
    albumId: SAMPLE_ALBUM_IDS.shabSokoutKavir,
    audioUri: SAMPLE_AUDIO_URI,
    coverImage: SAMPLE_ALBUMS[1].coverImage,
    lyrics:
      'شب سکوت کویر است و ستاره نزدیک‌تر\n' +
      'باد از کنار شن‌ها می‌گذرد آهسته‌تر\n\n' +
      'در دوردست این جاده، صدای ساز می‌آید\n' +
      'هر نت میان این شب، به قلب راز می‌آید\n\n' +
      'ای ماه، نگاهت کن، این خلوت بی‌انتها را\n' +
      'تا صبح با من بنشین، تا بشنوی سکوت ما را',
    sheetMusicUri: null,
    versionName: 'اجرای زنده در کویر',
    workId: null,
    versionId: null,
  },
];

const SAMPLE_JOURNAL_ENTRIES = [
  {
    id: 'sample_journal_bidad_calm',
    trackId: SAMPLE_TRACK_IDS.tasnifBidad,
    note: 'امروز این قطعه یادم انداخت که برای آرام شدن لازم نیست همیشه دنبال جواب بگردم.',
    mood: 'آرام',
    createdAt: '2025-05-14T19:30:00.000Z',
  },
  {
    id: 'sample_journal_bidad_thoughtful',
    trackId: SAMPLE_TRACK_IDS.tasnifBidad,
    note: 'صدای سازها انگار بخشی از یک خاطره‌ی دور را دوباره روشن کرد.',
    mood: 'متفکر',
    createdAt: '2025-06-02T21:15:00.000Z',
  },
  {
    id: 'sample_journal_kavir_calm',
    trackId: SAMPLE_TRACK_IDS.shabSokoutKavir,
    note: 'برای یک شب آرام و خلوت، انتخاب همیشگی من است.',
    mood: 'آرام',
    createdAt: '2025-06-18T22:05:00.000Z',
  },
  {
    id: 'sample_journal_kavir_thoughtful',
    trackId: SAMPLE_TRACK_IDS.shabSokoutKavir,
    note: 'امشب بیشتر از همیشه به فاصله‌ی بین سکوت‌ها گوش دادم.',
    mood: 'متفکر',
    createdAt: '2025-07-01T23:40:00.000Z',
  },
] as const;

const SAMPLE_LISTENING_HISTORY = [
  {
    id: 'sample_listen_bidad_1',
    trackId: SAMPLE_TRACK_IDS.tasnifBidad,
    listenedAt: '2025-05-14T19:28:00.000Z',
  },
  {
    id: 'sample_listen_bidad_2',
    trackId: SAMPLE_TRACK_IDS.tasnifBidad,
    listenedAt: '2025-06-02T21:12:00.000Z',
  },
  {
    id: 'sample_listen_bidad_3',
    trackId: SAMPLE_TRACK_IDS.tasnifBidad,
    listenedAt: '2025-07-06T18:20:00.000Z',
  },
  {
    id: 'sample_listen_kavir_1',
    trackId: SAMPLE_TRACK_IDS.shabSokoutKavir,
    listenedAt: '2025-06-18T22:02:00.000Z',
  },
  {
    id: 'sample_listen_kavir_2',
    trackId: SAMPLE_TRACK_IDS.shabSokoutKavir,
    listenedAt: '2025-07-01T23:37:00.000Z',
  },
] as const;

async function requireDatabase() {
  const database = await getDatabase();
  if (!database) {
    throw new Error('تزریق داده روی پیش‌نمایش وب در دسترس نیست؛ برنامه را در Android باز کنید.');
  }
  return database;
}

export interface SeedResult {
  artists: number;
  albums: number;
  tracks: number;
}

export async function injectSampleData(): Promise<SeedResult> {
  const database = await requireDatabase();

  for (const artist of SAMPLE_ARTISTS) {
    await database.runAsync(
      `INSERT INTO Artists (id, name, type, biography, genres, image, profileImage, galleryImages)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         biography = excluded.biography,
         genres = excluded.genres,
         image = excluded.image`,
      [
        artist.id,
        artist.name,
        artist.type,
        artist.biography,
        artist.genres,
        artist.image,
      artist.profileImage,
        artist.galleryImages,
      ],
    );
  }

  for (const album of SAMPLE_ALBUMS) {
    await database.runAsync(
      `INSERT INTO Albums (id, title, releaseYear, coverImage)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         releaseYear = excluded.releaseYear,
         coverImage = excluded.coverImage`,
      [album.id, album.title, album.releaseYear, album.coverImage],
    );
  }

  for (const link of SAMPLE_ARTIST_ALBUM_LINKS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO ArtistAlbums (artistId, albumId, source)
       VALUES (?, ?, 'inferred')`,
      [link.artistId, link.albumId],
    );
  }

  for (const track of SAMPLE_TRACKS) {
    await database.runAsync(
      `INSERT INTO Tracks
         (id, title, duration, artistId, albumId, audioUri, coverImage, lyrics, sheetMusicUri, versionName)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         duration = excluded.duration,
         artistId = excluded.artistId,
         albumId = excluded.albumId,
         audioUri = excluded.audioUri,
         coverImage = excluded.coverImage,
         lyrics = excluded.lyrics,
         sheetMusicUri = excluded.sheetMusicUri,
         versionName = excluded.versionName`,
      [
        track.id,
        track.title,
        track.duration,
        track.artistId,
        track.albumId,
        track.audioUri,
        track.coverImage,
        track.lyrics,
        track.sheetMusicUri,
        track.versionName,
      ],
    );
    await database.runAsync(
      `UPDATE Tracks
       SET lyrics = ?, coverImage = ?, versionName = ?
       WHERE id = ?`,
      [track.lyrics, track.coverImage, track.versionName, track.id],
    );
    if (track.albumId) {
      // Sample data carries membership, but no source-backed official order.
      await database.runAsync(
        `INSERT OR IGNORE INTO AlbumTracks
           (albumId, trackId, discNumber, trackNumber, titleOverride, notes, orderSource)
         VALUES (?, ?, NULL, NULL, NULL, NULL, 'legacy')`,
        [track.albumId, track.id],
      );
    }
  }

  // Keep personal edits intact when the sample button is pressed again.
  await database.runAsync(
    `INSERT OR IGNORE INTO PersonalRelationships
       (trackId, rating, favorite, emotionalTags, personalNote)
     VALUES (?, ?, ?, ?, ?)`,
    [SAMPLE_TRACK_IDS.tasnifBidad, 5, 1, 'نوستالژی، آرامش', 'اولین قطعه‌ای که در نغمه نگه داشتم.'],
  );
  await database.runAsync(
    `INSERT OR IGNORE INTO PersonalRelationships
       (trackId, rating, favorite, emotionalTags, personalNote)
     VALUES (?, ?, ?, ?, ?)`,
    [SAMPLE_TRACK_IDS.shabSokoutKavir, 4, 1, 'خلوت، شبانه', 'برای شب‌های آرام.'],
  );

  for (const entry of SAMPLE_JOURNAL_ENTRIES) {
    await database.runAsync(
      `INSERT OR IGNORE INTO JournalEntries (id, trackId, note, mood, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [entry.id, entry.trackId, entry.note, entry.mood, entry.createdAt],
    );
  }

  for (const historyEntry of SAMPLE_LISTENING_HISTORY) {
    await database.runAsync(
      `INSERT OR IGNORE INTO ListeningHistory (id, trackId, listenedAt)
       VALUES (?, ?, ?)`,
      [historyEntry.id, historyEntry.trackId, historyEntry.listenedAt],
    );
  }

  return {
    artists: SAMPLE_ARTISTS.length,
    albums: SAMPLE_ALBUMS.length,
    tracks: SAMPLE_TRACKS.length,
  };
}