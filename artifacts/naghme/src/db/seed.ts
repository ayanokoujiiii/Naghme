import { getDatabase } from '@/src/db/database';
import { AlbumRecord, ArtistRecord, TrackRecord } from '@/src/db/queries';

export const SAMPLE_ARTIST_IDS = {
  shajarian: 'sample_artist_shajarian',
  kalhor: 'sample_artist_kalhor',
  alizadeh: 'sample_artist_alizadeh',
  meshkatian: 'sample_artist_meshkatian',
  lotfi: 'sample_artist_lotfi',
  homayoun: 'sample_artist_homayoun',
  khaleghi: 'sample_artist_khaleghi',
  taraghi: 'sample_artist_taraghi',
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

export const SAMPLE_WORK_IDS = {
  bidad: 'sample_work_bidad',
  shabSokoutKavir: 'sample_work_shab_sokout_kavir',
  morghSahar: 'sample_work_morgh_sahar',
  baharDelneshin: 'sample_work_bahar_delneshin',
} as const;

export const SAMPLE_VERSION_IDS = {
  bidadStudio: 'sample_version_bidad_studio',
  bidadLive: 'sample_version_bidad_live',
  bidadReinterpretation: 'sample_version_bidad_reinterpretation',
  shabSokoutKavirLive: 'sample_version_shab_sokout_kavir_live',
} as const;

export const SAMPLE_COLLECTION_IDS = {
  evening: 'sample_collection_evening',
  favorites: 'sample_collection_favorites',
  instrumental: 'sample_collection_instrumental',
} as const;

export interface SeedArtistAlbumLink {
  artistId: string;
  albumId: string;
  source: 'explicit' | 'inferred';
}

/**
 * Seed-only catalogue input. The graph reads ArtistAlbums from SQLite; this
 * list is used only when the user explicitly injects the sample catalogue.
 */
export const SAMPLE_ARTIST_ALBUM_LINKS: readonly SeedArtistAlbumLink[] = [
  {
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    albumId: SAMPLE_ALBUM_IDS.bidad,
    source: 'explicit',
  },
  {
    artistId: SAMPLE_ARTIST_IDS.kalhor,
    albumId: SAMPLE_ALBUM_IDS.shabSokoutKavir,
    source: 'inferred',
  },
];

const SAMPLE_ARTIST_TIMELINE_EVENTS = [
  {
    id: 'sample_event_shajarian_birth',
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    title: 'زادروز',
    description: 'زادروز محمدرضا شجریان.',
    eventDate: '1940-09-23',
    source: 'Wikipedia، مقالهٔ محمدرضا شجریان',
  },
  {
    id: 'sample_event_shajarian_death',
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    title: 'درگذشت',
    description: 'درگذشت محمدرضا شجریان.',
    eventDate: '2020-10-08',
    source: 'Wikipedia، مقالهٔ محمدرضا شجریان',
  },
] as const;

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
    alternateTitles: 'خسرو آواز ایران',
    source: 'مستندات و داده‌های نمونهٔ پروژه',
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
    alternateTitles: 'کیهان کلهر',
    source: 'مستندات و داده‌های نمونهٔ پروژه',
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
    alternateTitles: 'حسین علیزاده',
    source: 'مستندات و داده‌های نمونهٔ پروژه',
  },
  {
    id: SAMPLE_ARTIST_IDS.meshkatian,
    name: 'پرویز مشکاتیان',
    type: 'آهنگساز و نوازندهٔ سنتور',
    biography:
      'پرویز مشکاتیان آهنگساز و نوازندهٔ سنتور و از چهره‌های اثرگذار موسیقی دستگاهی ایران بود. آثار او در پیوند با گروه عارف و اجرای خوانندگان برجسته شناخته می‌شوند.',
    genres: 'موسیقی دستگاهی، موسیقی سنتی',
    image: null,
    profileImage: null,
    galleryImages: null,
    alternateTitles: 'پرویز مشکاتیان',
    source: 'مستندات و داده‌های نمونهٔ پروژه',
  },
  {
    id: SAMPLE_ARTIST_IDS.lotfi,
    name: 'محمدرضا لطفی',
    type: 'آهنگساز و نوازندهٔ تار',
    biography:
      'محمدرضا لطفی آهنگساز و نوازندهٔ تار و سه‌تار و از پایه‌گذاران گروه شیدا بود. میراث او بخشی مهم از موسیقی دستگاهی معاصر ایران است.',
    genres: 'موسیقی دستگاهی، موسیقی سنتی',
    image: null,
    profileImage: null,
    galleryImages: null,
    alternateTitles: 'محمدرضا لطفی',
    source: 'مستندات و داده‌های نمونهٔ پروژه',
  },
  {
    id: SAMPLE_ARTIST_IDS.homayoun,
    name: 'همایون شجریان',
    type: 'خواننده و نوازندهٔ تنبک',
    biography:
      'همایون شجریان خواننده و نوازندهٔ تنبک است که در کنار فعالیت مستقل، در بخشی از مسیر هنری خود با پدرش محمدرضا شجریان همکاری داشته است.',
    genres: 'موسیقی دستگاهی، موسیقی تلفیقی',
    image: null,
    profileImage: null,
    galleryImages: null,
    alternateTitles: 'همایون شجریان',
    source: 'مستندات و داده‌های نمونهٔ پروژه',
  },
  {
    id: SAMPLE_ARTIST_IDS.khaleghi,
    name: 'روح‌الله خالقی',
    type: 'آهنگساز و تنظیم‌کننده',
    biography:
      'روح‌الله خالقی آهنگساز، موسیقی‌دان و نویسندهٔ ایرانی و از چهره‌های مهم شکل‌گیری موسیقی ملی ایران بود.',
    genres: 'موسیقی ملی، تصنیف',
    image: null,
    profileImage: null,
    galleryImages: null,
    alternateTitles: 'روح‌الله خالقی',
    source: 'مستندات و داده‌های نمونهٔ پروژه',
  },
  {
    id: SAMPLE_ARTIST_IDS.taraghi,
    name: 'بیژن ترقی',
    type: 'شاعر و ترانه‌سرا',
    biography:
      'بیژن ترقی شاعر و ترانه‌سرای ایرانی بود که ترانه‌های ماندگاری برای موسیقی معاصر ایران سرود.',
    genres: 'ترانه، موسیقی ملی',
    image: null,
    profileImage: null,
    galleryImages: null,
    alternateTitles: 'ترانه‌سرایان معاصر',
    source: 'مستندات و داده‌های نمونهٔ پروژه',
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
    workId: SAMPLE_WORK_IDS.bidad,
    versionId: SAMPLE_VERSION_IDS.bidadStudio,
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

const SAMPLE_WORKS = [
  {
    id: SAMPLE_WORK_IDS.bidad,
    title: 'بیداد',
    alternateTitles: 'بیدادِ همایون',
    description: 'یک اثر نمونه برای دیدن تفاوت میان خودِ اثر، نسخه‌های اجرا و قطعه‌های ضبط‌شده.',
    language: 'فارسی',
    genre: 'موسیقی دستگاهی',
    notes: 'این داده برای نمایش ارتباط اثر و نسخه در آرشیو نمونه است.',
  },
  {
    id: SAMPLE_WORK_IDS.shabSokoutKavir,
    title: 'شب، سکوت، کویر',
    alternateTitles: 'شب سکوت کویر',
    description: 'نمونه‌ای از یک اثر موسیقی ایرانی که یک اجرای زنده به آن متصل شده است.',
    language: 'فارسی',
    genre: 'موسیقی ایرانی',
    notes: null,
  },
  {
    id: SAMPLE_WORK_IDS.morghSahar,
    title: 'مرغ سحر',
    alternateTitles: 'مرغ سحر ناله سر کن',
    description: 'تصنیفی شناخته‌شده در موسیقی معاصر ایران با اجراها و بازخوانی‌های متعدد.',
    language: 'فارسی',
    genre: 'تصنیف',
    notes: 'برای نمایش یک اثر بدون نسخه‌ی نمونه‌ی متصل.',
  },
  {
    id: SAMPLE_WORK_IDS.baharDelneshin,
    title: 'بهار دلنشین',
    alternateTitles: 'بهار دل‌نشین',
    description: 'تصنیفی شناخته‌شده از موسیقی ملی ایران با شعر بیژن ترقی و موسیقی روح‌الله خالقی.',
    language: 'فارسی',
    genre: 'تصنیف',
    notes: 'این اثر برای نمایش نقش ترانه‌سرا و تنظیم‌کننده در نقشه‌ی نمونه اضافه شده است.',
  },
] as const;

const SAMPLE_VERSIONS = [
  {
    id: SAMPLE_VERSION_IDS.bidadStudio,
    workId: SAMPLE_WORK_IDS.bidad,
    name: 'اجرای استودیویی بیداد',
    kind: 'استودیویی',
    description: 'نسخه‌ی استودیویی نمونه از اثر بیداد.',
  },
  {
    id: SAMPLE_VERSION_IDS.bidadLive,
    workId: SAMPLE_WORK_IDS.bidad,
    name: 'اجرای زنده بیداد',
    kind: 'زنده',
    description: 'نسخه‌ی زنده‌ی نمونه برای مقایسه با اجرای استودیویی.',
  },
  {
    id: SAMPLE_VERSION_IDS.bidadReinterpretation,
    workId: SAMPLE_WORK_IDS.bidad,
    name: 'بازخوانی بیداد',
    kind: 'بازخوانی',
    description: 'برداشت دوباره‌ی نمونه از همان اثر.',
  },
  {
    id: SAMPLE_VERSION_IDS.shabSokoutKavirLive,
    workId: SAMPLE_WORK_IDS.shabSokoutKavir,
    name: 'اجرای زنده شب، سکوت، کویر',
    kind: 'زنده',
    description: 'نسخه‌ی زنده‌ی نمونه از این اثر.',
  },
] as const;

type SampleCredit = {
  id: string;
  artistId: string;
  roleId: string;
  workId?: string;
  trackId?: string;
  albumId?: string;
};

const SAMPLE_CREDITS: readonly SampleCredit[] = [
  { id: 'sample_credit_bidad_track_vocalist', artistId: SAMPLE_ARTIST_IDS.shajarian, roleId: 'role_vocalist', trackId: SAMPLE_TRACK_IDS.tasnifBidad },
  { id: 'sample_credit_bidad_track_composer', artistId: SAMPLE_ARTIST_IDS.meshkatian, roleId: 'role_composer', trackId: SAMPLE_TRACK_IDS.tasnifBidad },
  { id: 'sample_credit_bidad_track_musician', artistId: SAMPLE_ARTIST_IDS.lotfi, roleId: 'role_musician', trackId: SAMPLE_TRACK_IDS.tasnifBidad },
  { id: 'sample_credit_bidad_album_vocalist', artistId: SAMPLE_ARTIST_IDS.shajarian, roleId: 'role_vocalist', albumId: SAMPLE_ALBUM_IDS.bidad },
  { id: 'sample_credit_bidad_album_composer', artistId: SAMPLE_ARTIST_IDS.meshkatian, roleId: 'role_composer', albumId: SAMPLE_ALBUM_IDS.bidad },
  { id: 'sample_credit_bidad_work_vocalist', artistId: SAMPLE_ARTIST_IDS.shajarian, roleId: 'role_vocalist', workId: SAMPLE_WORK_IDS.bidad },
  { id: 'sample_credit_bidad_work_composer', artistId: SAMPLE_ARTIST_IDS.meshkatian, roleId: 'role_composer', workId: SAMPLE_WORK_IDS.bidad },
  { id: 'sample_credit_kavir_track_vocalist', artistId: SAMPLE_ARTIST_IDS.shajarian, roleId: 'role_vocalist', trackId: SAMPLE_TRACK_IDS.shabSokoutKavir },
  { id: 'sample_credit_kavir_track_musician', artistId: SAMPLE_ARTIST_IDS.kalhor, roleId: 'role_musician', trackId: SAMPLE_TRACK_IDS.shabSokoutKavir },
  { id: 'sample_credit_kavir_album_composer', artistId: SAMPLE_ARTIST_IDS.kalhor, roleId: 'role_composer', albumId: SAMPLE_ALBUM_IDS.shabSokoutKavir },
  { id: 'sample_credit_kavir_work_composer', artistId: SAMPLE_ARTIST_IDS.kalhor, roleId: 'role_composer', workId: SAMPLE_WORK_IDS.shabSokoutKavir },
  { id: 'sample_credit_bahar_work_composer', artistId: SAMPLE_ARTIST_IDS.khaleghi, roleId: 'role_composer', workId: SAMPLE_WORK_IDS.baharDelneshin },
  { id: 'sample_credit_bahar_work_arranger', artistId: SAMPLE_ARTIST_IDS.khaleghi, roleId: 'role_arranger', workId: SAMPLE_WORK_IDS.baharDelneshin },
  { id: 'sample_credit_bahar_work_lyricist', artistId: SAMPLE_ARTIST_IDS.taraghi, roleId: 'role_lyricist', workId: SAMPLE_WORK_IDS.baharDelneshin },
] as const;

const SAMPLE_COLLECTIONS = [
  {
    id: SAMPLE_COLLECTION_IDS.evening,
    title: 'برای شب‌های آرام',
    description: 'قطعه‌هایی برای شنیدن در خلوت شبانه.',
    coverImage: SAMPLE_ALBUMS[0].coverImage,
    trackIds: [SAMPLE_TRACK_IDS.tasnifBidad, SAMPLE_TRACK_IDS.shabSokoutKavir],
  },
  {
    id: SAMPLE_COLLECTION_IDS.favorites,
    title: 'انتخاب‌های ماندگار',
    description: 'چند قطعهٔ نمونه برای شروع آرشیو.',
    coverImage: SAMPLE_ALBUMS[1].coverImage,
    trackIds: [SAMPLE_TRACK_IDS.baroun, SAMPLE_TRACK_IDS.khaneh],
  },
  {
    id: SAMPLE_COLLECTION_IDS.instrumental,
    title: 'ساز و سکوت',
    description: 'اجراهای سازی و آرام برای تمرکز.',
    coverImage: null,
    trackIds: [SAMPLE_TRACK_IDS.shabSokoutKavir],
  },
] as const;

const SAMPLE_ARTIST_RELATIONSHIPS = [
  {
    id: 'sample_artist_relationship_shajarian_alizadeh',
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    relatedArtistId: SAMPLE_ARTIST_IDS.alizadeh,
    description: 'همکاری در تولید و اجرای آثار موسیقی ایرانی',
  },
  {
    id: 'sample_artist_relationship_shajarian_kalhor',
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    relatedArtistId: SAMPLE_ARTIST_IDS.kalhor,
    description: 'همکاری در آلبوم شب، سکوت، کویر',
  },
  {
    id: 'sample_artist_relationship_shajarian_meshkatian',
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    relatedArtistId: SAMPLE_ARTIST_IDS.meshkatian,
    description: 'همکاری در اجرای آثار گروه عارف',
  },
  {
    id: 'sample_artist_relationship_shajarian_homayoun',
    artistId: SAMPLE_ARTIST_IDS.shajarian,
    relatedArtistId: SAMPLE_ARTIST_IDS.homayoun,
    description: 'رابطه‌ی خانوادگی و همکاری موسیقایی',
  },
] as const;

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
    throw new Error('افزودن داده‌های نمونه در پیش‌نمایش وب در دسترس نیست؛ برنامه را در Android باز کن.');
  }
  return database;
}

export interface SeedResult {
  artists: number;
  albums: number;
  tracks: number;
  works: number;
  versions: number;
  credits: number;
  relationships: number;
  collections: number;
  collectionTracks: number;
}

export async function injectSampleData(): Promise<SeedResult> {
  const database = await requireDatabase();
  const now = new Date().toISOString();

  for (const artist of SAMPLE_ARTISTS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO Artists
         (id, name, type, biography, genres, image, profileImage, galleryImages, alternateTitles, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        artist.id,
        artist.name,
        artist.type,
        artist.biography,
        artist.genres,
        artist.image,
      artist.profileImage,
        artist.galleryImages,
        artist.alternateTitles,
        artist.source,
      ],
    );
  }

  for (const event of SAMPLE_ARTIST_TIMELINE_EVENTS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO ArtistTimelineEvents
         (id, artistId, title, description, eventDate, source, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [event.id, event.artistId, event.title, event.description, event.eventDate, event.source, now, now],
    );
  }

  for (const album of SAMPLE_ALBUMS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO Albums (id, title, releaseYear, coverImage)
       VALUES (?, ?, ?, ?)`,
      [album.id, album.title, album.releaseYear, album.coverImage],
    );
  }

  for (const link of SAMPLE_ARTIST_ALBUM_LINKS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO ArtistAlbums (artistId, albumId, source)
       VALUES (?, ?, ?)`,
      [link.artistId, link.albumId, link.source],
    );
  }

  for (const work of SAMPLE_WORKS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO Works
         (id, title, alternateTitles, description, language, genre, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        work.id,
        work.title,
        work.alternateTitles,
        work.description,
        work.language,
        work.genre,
        work.notes,
        now,
        now,
      ],
    );
  }

  for (const version of SAMPLE_VERSIONS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO Versions
         (id, workId, name, kind, description, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
      [version.id, version.workId, version.name, version.kind, version.description, now, now],
    );
  }

  for (const track of SAMPLE_TRACKS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO Tracks
         (id, title, duration, artistId, albumId, audioUri, coverImage, lyrics, sheetMusicUri, versionName, workId, versionId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        track.workId,
        track.versionId,
      ],
    );
    await database.runAsync(
      `UPDATE Tracks
       SET workId = COALESCE(workId, ?), versionId = COALESCE(versionId, ?)
       WHERE id = ?`,
      [track.workId, track.versionId, track.id],
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

  for (const credit of SAMPLE_CREDITS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO Credits
         (id, artistId, roleId, workId, trackId, albumId, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        credit.id,
        credit.artistId,
        credit.roleId,
        credit.workId ?? null,
        credit.trackId ?? null,
        credit.albumId ?? null,
        now,
        now,
      ],
    );
  }

  for (const collection of SAMPLE_COLLECTIONS) {
    await database.runAsync(
      `INSERT OR IGNORE INTO Collections
         (id, title, description, coverImage, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [collection.id, collection.title, collection.description, collection.coverImage, now, now],
    );
    for (const [position, trackId] of collection.trackIds.entries()) {
      await database.runAsync(
        `INSERT OR IGNORE INTO CollectionTracks (collectionId, trackId, position)
         VALUES (?, ?, ?)`,
        [collection.id, trackId, position],
      );
    }
  }

  for (const relationship of SAMPLE_ARTIST_RELATIONSHIPS) {
    const directions = [
      [relationship.artistId, relationship.relatedArtistId, `${relationship.id}:forward`],
      [relationship.relatedArtistId, relationship.artistId, `${relationship.id}:reverse`],
    ] as const;
    for (const [artistId, relatedArtistId, id] of directions) {
      await database.runAsync(
        `INSERT OR IGNORE INTO ArtistRelationships
           (id, artistId, relatedArtistId, description, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [id, artistId, relatedArtistId, relationship.description, now],
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
    works: SAMPLE_WORKS.length,
    versions: SAMPLE_VERSIONS.length,
    credits: SAMPLE_CREDITS.length,
    relationships: SAMPLE_ARTIST_RELATIONSHIPS.length,
    collections: SAMPLE_COLLECTIONS.length,
    collectionTracks: SAMPLE_COLLECTIONS.reduce((count, collection) => count + collection.trackIds.length, 0),
  };
}