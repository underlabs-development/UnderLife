---
name: django-async
description: Use when writing or editing async controller methods, service methods, or any async function that touches the Django ORM, transactions, or sync-only APIs in this repo. Triggers on anything using `async def` alongside QuerySets, `.save()`, `.delete()`, `.objects.`, `get_object_or_404`, `transaction.atomic`, or signals.
---

# Django async rules for lexroom-backend

Controllers use `async def`, but Django's ORM is still sync-first. Follow these rules exactly.

## 1. Never call ORM directly from async code
Wrap ORM calls in `asgiref.sync.sync_to_async`:

```python
from asgiref.sync import sync_to_async

user = await sync_to_async(User.objects.get)(pk=user_id)
items = await sync_to_async(list)(MyModel.objects.filter(...))  # force eval inside sync
```

Common foot-guns:
- A bare `MyModel.objects.filter(...)` returns a lazy QuerySet — evaluating it later (e.g. `for x in qs`, `len(qs)`, serializing) will hit the DB from async context. Force evaluation inside `sync_to_async(list)(...)`.
- Accessing a FK/M2M attribute (`obj.related`) lazily fetches — wrap the access or use `select_related`/`prefetch_related` inside the sync block.

## 2. Never use `async with transaction.atomic()`
Django has NO async `transaction.atomic()`. Do this instead:

```python
from django.db import transaction
from asgiref.sync import sync_to_async

@transaction.atomic
def _do_work_sync(payload):
    # all ORM operations here
    ...

await sync_to_async(_do_work_sync)(payload)
```

The `@transaction.atomic` decorator is applied to a **sync** function that is then called via `sync_to_async`.

## 3. Prefer existing helpers
- For "release DB connection during long I/O": use `@long_operation` / `@async_long_operation` (see `skills/db-pool`).
- For background work: follow whatever pub/sub pattern the target app uses — do not hand-roll threading.

## 4. Signals, middleware, auth hooks
These often run sync. If you call them from async, wrap with `sync_to_async`. Do not convert them to async yourself.

## 5. Quick checklist before finalizing an async function
- [ ] Every ORM access is wrapped in `sync_to_async` (including implicit FK dereferences).
- [ ] No `async with transaction.atomic()` anywhere.
- [ ] Transactions live inside a sync helper decorated with `@transaction.atomic`.
- [ ] QuerySets are forcibly evaluated inside the sync block (no leaking lazy QS into async scope).
