---
name: Music graph schema boundary
description: How the music graph represents artist-to-album links without changing the Phase 3 SQLite schema.
---

The Phase 3 SQLite schema relates Tracks to Albums but has no artistId column or artist-album join table. Seeded graph links therefore live beside the seed catalogue, while user-created albums are shown as unassigned branches.

**Why:** The Phase 4 requirement explicitly protects the stable native/web SQLite adapters and existing routing, so adding a migration just for the first graph version would increase risk and break the established foundation.

**How to apply:** If a later phase needs editable artist-album relationships for arbitrary user data, add a deliberate schema migration and CRUD flow rather than silently extending the current seed-only association.