---
description: Run the full pre-flight suite (ruff, mypy, migration check, tests) and report pass/fail per step.
---

Run the following, in order, stopping at the first failure and showing the error output. Do **not** try to auto-fix beyond `ruff --fix`; surface issues for me to decide.

1. `uv run ruff check --fix .`
2. `uv run ruff format --check .`
3. `uv run mypy lexroom_backend`
4. `LOGFIRE_TOKEN=test DJANGO_SETTINGS_MODULE=lexroom_backend.settings.pre_commit uv run python manage.py makemigrations --check --dry-run`
5. `LOGFIRE_TOKEN=test uv run pytest -x`

Then give a one-line summary: ✅ all green, or ❌ which step failed and the first error.
