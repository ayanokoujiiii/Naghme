---
name: Album track ordering
description: Album membership is independent from legacy track metadata, and only source-backed positions are official.
---

AlbumTracks must preserve membership even when ordering is unknown. Store explicit disc/track positions separately from legacy or unknown relationships; never turn insertion order, rowid, or a title sort into official history.

**Why:** Existing Tracks.albumId data identifies membership but does not prove historical track numbers, while the archive may eventually allow one track in multiple albums.

**How to apply:** Use the junction relationship for album-track queries and graph traversal, keep legacy albumId for compatibility, and label or preserve unknown ordering rather than fabricating numbers.