---
name: Postcard project persistence
description: Durable rules for saved postcard studio projects and device-local assets.
---

Postcard studio state belongs in one versioned settings payload. Gesture-driven text and sticker transforms must be copied back to JavaScript state before saving, and every restored field must be type-checked with a safe default.

**Why:** The project must remain editable even when a cover or custom background path is no longer available, while future studio options should not require a new column for every visual setting.

**How to apply:** Preserve the settings version, keep local image paths optional, validate restored values, and fall back only the unavailable asset rather than discarding the project.