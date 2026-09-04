---
name: Music graph schema boundary
description: How the music graph stores explicit and inferred artist-to-album links in SQLite.
---

Artist-to-album membership is now a first-class SQLite join table with a source of explicit or inferred. Migration 7 backfills inferred links from existing track/album membership, while seed data is inserted into the same table.

**Why:** The graph must represent user-created relationships and migrated legacy data consistently; deriving links in the UI makes the graph incomplete and impossible to edit safely.

**How to apply:** Keep graph reads pointed at the persisted join table. Preserve source provenance when importing legacy data, and write user edits as explicit links.

The graph’s mobile presentation is list-based rather than SVG node-and-edge rendering: grouped relationship rows keep Persian text readable while the data graph remains independent from its presentation.

**Why:** The node-and-edge SVG layout became unreadable on phone-sized screens with Persian labels and overlapping edge captions.

**How to apply:** Keep `src/graph/musicGraph.ts` focused on graph data and use ordinary RTL `Text` rows for graph presentation; do not infer schema changes from the visual redesign.