---
description: Run the tests for a single app. Usage: /test-app <app_name> (e.g. /test-app auth).
argument-hint: <app_name>
---

Run the tests for the given app with required env vars:

```bash
LOGFIRE_TOKEN=test uv run pytest tests/apps/$ARGUMENTS/ -xvs
```

If `$ARGUMENTS` is empty, ask me which app. If the directory does not exist, list available apps under `tests/apps/` and stop.
