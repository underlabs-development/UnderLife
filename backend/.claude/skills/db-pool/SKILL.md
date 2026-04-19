---
name: db-pool
description: Use when writing code that performs external I/O (HTTP calls to LiteLLM, Pinecone, Elasticsearch, GCS, Brevo, SendGrid, Document AI, BigQuery, etc.) inside a request handler or service method, especially one that also touches the database.
---

# psycopg3 connection pool — don't starve it

lexroom-backend uses a psycopg3 connection pool (`max_size=10` in production). A single slow external call can hold a DB connection for seconds and block every other request. The repo's solution is to explicitly release the connection during long I/O.

## Rule

If a function (sync or async) makes a call that:
- hits an external network service (LLM, vector DB, GCS, webhook target, email provider, etc.), or
- is known to take > ~100ms and is not DB work,

then it must either:

1. Not hold a DB connection at all (do the I/O outside any transaction/queryset iteration), **or**
2. Be decorated with `@long_operation` (sync) or `@async_long_operation` (async), which releases the connection back to the pool for the duration of the call.

## Typical shape

```python
from lexroom_backend.common.db import async_long_operation  # confirm import path in repo

@async_long_operation
async def call_llm(prompt: str) -> str:
    # pool connection is released for the duration of this call
    return await litellm_client.acompletion(...)
```

## Anti-patterns
- Holding an open transaction across an external HTTP call.
- Iterating a QuerySet while awaiting external I/O per-row.
- Decorating trivial pure-Python helpers with `@long_operation` — adds overhead for no gain.

## Before using
Confirm the actual decorator names and import path in the repo (search for `long_operation`). Names/locations may evolve — do not invent them from this skill.
