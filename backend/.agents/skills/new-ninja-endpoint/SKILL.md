---
name: new-ninja-endpoint
description: Use when adding a new Django Ninja endpoint, controller, or modifying routing in lexroom-backend. Ensures the endpoint is auto-discovered, uses the right auth/permissions, and follows the project's service-layer conventions.
---

# Adding a Django Ninja endpoint

## Placement
- Endpoints live in `lexroom_backend/apps/<app>/api.py` on a class decorated with `@api_controller()`.
- The central `NinjaExtraAPIExtended` in `lexroom_backend/api.py` auto-discovers controllers — **do not manually register** a controller there.
- Business logic belongs in `lexroom_backend/services/`, injected via `injector`. Keep the controller thin.

## Checklist for a new endpoint
1. **Schema**: request/response use Ninja / `ninja_schema` pydantic-style schemas. Put them next to the controller (e.g. `schemas.py` in the app).
2. **Auth**: use the project's auth classes from `apps/common` (JWT / magic link etc.) — do not roll your own.
3. **Permissions**: reuse permission classes from `apps/common/permissions`.
4. **Async**: prefer `async def` for handlers. Follow the `django-async` skill rules for any ORM access.
5. **Service injection**: take services as constructor args on the controller; use `injector` bindings rather than importing singletons.
6. **Errors**: raise the Ninja exception types the rest of the repo uses (check neighboring controllers). Do not return raw dicts with `"error": ...`.
7. **Long I/O**: if the handler calls external services, follow the `db-pool` skill.
8. **Tests**: add `tests/apps/<app>/integration/test_<feature>.py` using `AsyncClient` for async controllers.
9. **OpenAPI**: `openapi.yaml` may need regenerating — check how the repo does this (look for a management command or CI step) rather than hand-editing.

## Don't
- Don't add middleware or settings changes to make one endpoint work — solve it at the controller layer.
- Don't bypass the service layer "just for this endpoint".
