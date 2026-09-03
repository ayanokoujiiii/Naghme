---
name: Cover color extraction
description: Native cover-color extraction compatibility across Expo Go, Android, iOS, and web.
---

Use native image-color extraction only through a lazy import, and keep a local image-parser fallback. Treat the result as platform-specific: Android and web expose dominant colors, while iOS exposes background and primary colors.

**Why:** The native module may be unavailable in Expo Go, and its result type differs by platform; a static import or unguarded field access can break startup or typechecking.

**How to apply:** Pass a deterministic palette color to the native fallback option, fall back to the local parser when import/extraction fails, and narrow returned values using the platform discriminator.