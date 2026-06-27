# UnderLife — backend

Django 6 + django-ninja API (Postgres). Apps live under `under_backend/apps/`.

## Setup

```bash
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
```

Postgres connection and other settings are read from `backend/.env`.

## UnderFinance AI features (optional, local-first)

UnderFinance can auto-categorize transactions and generate a savings advisor.
Everything works **without** any AI — the deterministic layers (description cache,
user rules, and the rule-based insight engine) always run. The optional LLM tier
runs **locally** so financial data never leaves the machine.

### Enable the local model

1. Install [Ollama](https://ollama.com/download).
2. Pull the model:
   ```bash
   ollama pull qwen2.5:3b-instruct-q4_K_M
   ```
3. Make sure Ollama is running (it serves `http://localhost:11434`).

Override defaults via env if needed:

```
OLLAMA_MODEL=qwen2.5:3b-instruct-q4_K_M
OLLAMA_HOST=http://localhost:11434
```

If Ollama is unavailable, categorization falls back to cache + rules (novel
descriptions stay in the review queue) and the advisor shows plain templated
tips — the app never errors.

### How categorization works (cascade)

`POST /api/finance/categorize` runs every uncategorized transaction through:

1. **Cache** — a normalized-description → category lookup (`CategorizedDescription`).
2. **Rules** — user-defined `contains`/`regex` rules (`CategorizationRule`).
3. **Local LLM** — only for genuinely novel descriptions; assigns only above the
   per-user `confidence_threshold`, otherwise leaves it for one-tap review.

Manual category edits and rule hits are written back to the cache, so the system
needs the model less over time.

### Savings advisor

`GET /api/finance/insights?month=YYYY-MM` computes every figure deterministically
(overspend vs budget, savings rate vs 50/30/20, recurring-charge detection,
month-over-month deltas, goal pacing). When `ai_phrasing_enabled` is on, the local
model only **rewrites** those tips — a numbers-grounding guardrail rejects any
sentence containing a figure that wasn't in the input, so it can't invent numbers.

## Tests

```bash
uv run python manage.py test under_backend.apps.finance
```
