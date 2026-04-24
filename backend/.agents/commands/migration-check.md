---
description: Check for unstaged Django migrations after editing models.
---

Run:

```bash
LOGFIRE_TOKEN=test DJANGO_SETTINGS_MODULE=lexroom_backend.settings.pre_commit \
  uv run python manage.py makemigrations --check --dry-run
```

- Exit 0: report "no migration drift".
- Non-zero: show the output, then ask me whether to run `uv run python manage.py makemigrations` and stage the result. Do not auto-generate migrations without confirmation — migration naming matters.
