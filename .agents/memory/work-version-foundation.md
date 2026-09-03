---
name: Work and Version foundation
description: Keep Work and Version optional at the Track layer while preserving incomplete domain knowledge.
---

Works are standalone creations; Versions belong to exactly one Work; Tracks may reference either independently, with a query-layer check when both references are present.

**Why:** A personal archive may know a recording without knowing its work, or know a work before any recording exists. Requiring fabricated links would damage provenance.

**How to apply:** Keep Tracks.workId and Tracks.versionId nullable, use SET NULL when deleting an optional parent, block Work deletion while Versions remain, and never infer links from titles.