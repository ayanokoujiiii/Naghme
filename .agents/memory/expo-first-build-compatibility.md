---
name: Expo first-build compatibility
description: Compatibility lessons for Expo SDK native modules and the Replit web preview.
---

Expo native modules should be installed with `expo install` so their versions match the app's SDK; generic package installation can select incompatible major versions. Native-only navigation should be guarded by platform, and web font loading must not block the preview forever.

**Why:** In this environment, unpinned installs selected future major versions of Expo modules, and the web preview can stay blank when startup waits on native-oriented loading behavior.

**How to apply:** After adding Expo packages, run the SDK compatibility check and use `expo install` for Expo-owned modules. Keep the native splash/font gate for devices, but provide a web-safe render path and avoid evaluating native tab implementations on web.