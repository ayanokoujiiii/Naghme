---
name: Git transport for push
description: Delivery constraint for syncing Naghme's local commit history to GitHub.
---

Repository delivery must use Git transport push from the local repository; connector content uploads are not equivalent to a push.

**Why:** Uploading repository contents through a connector can create an independent history and break the relationship between the local branch and the remote branch, even when the connector OAuth connection is healthy.

**How to apply:** Preserve local history, avoid force/reset unless explicitly authorized, use the configured Git remote, and only use a workspace secret URL through the Git command without printing or persisting its value.