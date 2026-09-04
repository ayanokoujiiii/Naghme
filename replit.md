# نغمه

نغمه یک آرشیو شخصی موبایلی برای نگهداری، شنیدن و معنا دادن به موسیقی ایرانی و خاطره‌های پیرامون آن است.

## Run & Operate

- `pnpm --filter @workspace/naghme run dev` — run the Expo mobile app
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push the server DB schema in development only

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo SDK 54, Expo Router, React Native, expo-av, expo-sqlite

## Where things live

- `artifacts/naghme/app/` — Expo Router screens for home, archive, search, recommendations, details and playback
- `artifacts/naghme/src/audio/` — playback queue, audio state, background audio and local audio files
- `artifacts/naghme/src/db/database.ts` — mobile SQLite schema and initialization
- `artifacts/naghme/src/db/migrations.ts` — versioned SQLite migrations
- `artifacts/naghme/src/db/queries.ts` — typed mobile data queries and mutations
- `artifacts/naghme/src/ai/` — optional user-owned Gemini enhancement and local recommendation fallback
- `artifacts/naghme/constants/` and `artifacts/naghme/hooks/` — mobile theme and color hooks
- `lib/db/` — separate server PostgreSQL schema and Drizzle configuration
- `lib/api-spec/` — API contract source and generated client inputs

## Architecture decisions

- The mobile archive is local-first: SQLite in `artifacts/naghme` is independent from the server PostgreSQL/Drizzle database in `lib/db`.
- User-selected audio is copied into the app's document storage; legacy cache URIs are migrated after SQLite initialization.
- `ListeningHistory` is authoritative. Playback starts are logged by the audio layer rather than individual screens.
- Work and Version links remain optional and provenance-safe; titles never imply a domain identity.
- Background playback configuration currently targets iOS audio mode only. Android lock-screen controls and foreground services are outside this phase.

## Product

- Add artists, albums, works, versions and tracks to a personal archive.
- Attach local audio, lyrics, sheet music and personal notes.
- Play one track or an ordered queue from home, search, recommendations, albums, and artists.
- Use repeat-off, repeat-track, repeat-queue, shuffle, sleep timers, and a persistent mini player.
- Record listening history and journal moods, and generate local or optional Gemini recommendations.

## User preferences

- UI copy is Persian and the app uses RTL layout.
- Do not add packages or replace the existing Expo/audio architecture without an explicit request.

## Gotchas

- Use `expo-file-system/legacy` for the current Expo SDK audio-file APIs.
- Do not request MediaLibrary permission for audio selection; DocumentPicker handles file selection.
- `expo-av` remains the supported audio implementation for SDK 54 in this phase; do not migrate it to a replacement audio package as part of unrelated work.
- The web preview is not a valid verification environment for native SQLite or device audio behavior.
- For GitHub delivery, push through Git transport. Connector content uploads create independent history and are not a substitute for push.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- For mobile-specific changes, use the Expo workflow and verify on a native device/Expo Go where the feature requires SQLite or audio.