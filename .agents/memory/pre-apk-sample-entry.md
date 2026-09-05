---
name: Remove sample-data entry before final APK
description: The home screen's sample-data entry is temporary and should disappear before the final APK build.
---

Keep the sample-data function available for development and recovery, but remove only its home-screen entry before creating the final APK.

**Why:** The app still needs the sample-data action during development, while a shipped personal archive should not invite users to seed demo content.

**How to apply:** Before the final APK build, remove or hide the home-screen card and leave the underlying sample-data implementation intact unless the user explicitly asks for a deeper cleanup.