---
name: Expo static build port conflict
description: The static Expo bundle builder assumes port 8081, which can collide with the mockup preview workflow.
---

When producing a static Expo Go bundle, the mockup preview service must not occupy Expo's default Metro port.

**Why:** The build script probes and serves Metro on port 8081 without accepting a port override, so a running Vite mockup service makes Expo interpret the port conflict interactively and time out in non-interactive mode.

**How to apply:** Keep the mockup workflow available for normal preview work, but temporarily stop it for the static Expo build and restart it after the build completes.