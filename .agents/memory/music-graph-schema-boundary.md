---
name: Music graph schema boundary
description: How the music graph stores explicit and inferred artist-to-album links in SQLite.
---

Artist-to-album membership is now a first-class SQLite join table with a source of explicit or inferred. Migration 7 backfills inferred links from existing track/album membership, while seed data is inserted into the same table.

**Why:** The graph must represent user-created relationships and migrated legacy data consistently; deriving links in the UI makes the graph incomplete and impossible to edit safely.

**How to apply:** Keep graph reads pointed at the persisted join table. Preserve source provenance when importing legacy data, and write user edits as explicit links.