---
name: Gemini key ownership
description: Product decision for optional Gemini recommendations and API-key handling in Naghme
---

Naghme intentionally supports an optional user-owned Gemini API key stored locally on the device. Recommendations must remain fully functional with a local algorithm when the key is absent or Gemini is unavailable.

**Why:** The product explicitly asks the user to configure their own Gemini key and prioritizes native/offline-friendly personal archive behavior; routing that key through a shared server or making AI mandatory would change the privacy and reliability model.

**How to apply:** Keep the key out of project files, logs, chat, and server environment variables. Treat remote Gemini output as an enhancement, never as the only recommendation path.