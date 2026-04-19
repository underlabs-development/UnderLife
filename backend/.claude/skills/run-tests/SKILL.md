---
name: run-tests
description: Use any time tests need to be run, debugged, or added in lexroom-backend. Covers required env vars, testcontainers gotchas, and pytest invocation patterns.
---

# Running tests in lexroom-backend

## Required env vars
Always export both:

- `LOGFIRE_TOKEN=test` — avoids Google Secret Manager round-trip.
- `DJANGO_SETTINGS_MODULE=lexroom_backend.settings.testing` — pytest-django picks this up via `pyproject.toml`, but set it explicitly for one-off manual runs (makemigrations etc.).

Canonical invocations:

```bash
# Full suite
LOGFIRE_TOKEN=test uv run pytest

# A specific app
LOGFIRE_TOKEN=test uv run pytest tests/apps/auth/

# A specific test by name
LOGFIRE_TOKEN=test uv run pytest -k "test_something"

# With live logs for debugging
LOGFIRE_TOKEN=test uv run pytest -xvs path/to/test.py::test_fn
```

## Testcontainers
Postgres + GCP emulators (Datastore, Pub/Sub, Storage) spin up via testcontainers. First run is slow (image pulls); do not kill the run on the first "hang".

If Docker is not running tests will hard-fail with an obscure error — check `docker ps` before retrying.

## Test layout
- `tests/apps/<app>/unittests/` — fast, no DB.
- `tests/apps/<app>/integration/` — DB + emulators.

Use `AsyncClient` for `async def` Ninja controllers, `Client` for sync.

## Rules
- Do NOT mock the Django ORM. Use factories (`factory_boy`) and the real test DB.
- Do NOT change settings files to make a test pass. Fix the test or the code.
- When you add a feature, add a test in the matching `tests/apps/<app>/` tree.
- After editing, run the relevant test file first, then the app's folder, then the full suite.
