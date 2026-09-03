---
name: Expo first-build compatibility
description: Compatibility lessons for Expo SDK native modules and the Replit web preview.
---

Expo native modules should be installed with `expo install` so their versions match the app's SDK; generic package installation can select incompatible major versions. Native-only navigation should be guarded by platform, and modules with web WASM/native entrypoints may need a platform-specific adapter.

**Why:** In this environment, unpinned installs selected future major versions of Expo modules, and a static expo-sqlite import made the web bundler resolve a missing WASM asset even when runtime code skipped SQLite on web.

**How to apply:** After adding Expo packages, run the SDK compatibility check and use `expo install` for Expo-owned modules. Keep the native splash/font gate for devices, provide a web-safe render path, and use `.web.ts` adapters when Metro resolves an unsupported native/WASM entrypoint during web export.