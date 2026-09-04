---
name: Expo audio phase boundary
description: Naghme's supported audio implementation and scope boundary for SDK 54.
---

Naghme currently uses expo-av with Expo SDK 54 for playback, queue completion, and iOS background audio. Do not migrate the audio implementation as part of ordinary Phase 4 work.

**Why:** The app's native playback behavior is already built around expo-av, while a replacement would introduce a separate compatibility and native-build migration unrelated to the requested persistence and queue fixes.

**How to apply:** Keep expo-av aligned with the installed Expo SDK, use `Audio.setAudioModeAsync` for the current iOS background-audio scope, and leave Android lock-screen controls/foreground services for a separately planned phase.