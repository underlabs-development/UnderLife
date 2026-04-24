---
name: pre-commit-checks
description: Use before declaring a coding task "done" in lexroom-backend, or before creating a commit/PR. Runs the same checks the pre-commit hook enforces so CI does not fail.
---

# Pre-flight checks before commit / PR

Run these in order. Stop at the first failure and fix before moving on.

## 1. Lint + format
```bash
uv run ruff check --fix .
uv run ruff format .
```

## 2. Type checking
```bash
uv run mypy lexroom_backend
```
Mypy runs against the package, not `tests/`. Do not silence errors with `# type: ignore` unless there is a concrete reason — prefer fixing types.

## 3. Migration drift check
If you touched any `models.py`, verify there are no unstaged migrations:
```bash
LOGFIRE_TOKEN=test DJANGO_SETTINGS_MODULE=lexroom_backend.settings.pre_commit \
  uv run python manage.py makemigrations --check --dry-run
```
If it reports missing migrations, generate them:
```bash
uv run python manage.py makemigrations
```
and stage the new files.

## 4. Tests
At minimum the app's tests that cover your change:
```bash
LOGFIRE_TOKEN=test uv run pytest tests/apps/<affected_app>/ -x
```

## 5. Full pre-commit (optional but authoritative)
```bash
uv run pre-commit run --all-files
```
This reproduces exactly what the hook runs on commit. If it's green, the commit will pass.

## Never
- Never skip hooks with `--no-verify`.
- Never edit `.pre-commit-config.yaml` just to make a check pass — fix the code.
