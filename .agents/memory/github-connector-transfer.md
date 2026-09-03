---
name: GitHub connector transfer
description: Environment-specific behavior when transferring repository contents through the Replit GitHub connector.
---

Repository writes through the GitHub connector can occasionally return a Cloudflare HTML 403 for particular content payloads even while the OAuth connection and GitHub rate limit are healthy.

**Why:** The response is from an intermediary filter rather than GitHub’s REST API, so treating it as an authentication failure leads to unnecessary reconnect attempts and can interrupt a valid transfer.

**How to apply:** Inspect response status and content type before parsing JSON, retry in small batches, and use an equivalent accepted encoding representation that decodes to the exact original bytes when the proxy filter is content-sensitive. Re-verify the final tree against the local file set.