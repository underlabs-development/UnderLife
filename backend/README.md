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

## Bank import (Enable Banking, optional)

UnderFinance can auto-import transactions directly from Italian banks via
**Enable Banking** (PSD2 aggregator). You ride *their* AISP licence + eIDAS
certificates — you do **not** need your own licence or certificates, and bank
credentials never touch this app (SCA happens on the bank's own page).

### Why Enable Banking
For a single self-hosted user in Italy it is the only aggregator that is free
(for your own accounts), self-serve (no enterprise contract), and live-capable
against the major Italian banks incl. **BancoPosta** (via the CBI Globe hub),
Intesa, UniCredit, BPER, Fineco, etc. (GoCardless/Nordigen closed new signups in
2025; Tink/TrueLayer/Plaid/Salt Edge are sales-gated.)

### Setup
1. Sign up at the Enable Banking control panel and create an Application in
   **restricted production** ("activate by linking accounts"), whitelisting your
   own account(s).
2. Generate an RSA keypair; register the public key, note the Application ID.
3. Set the redirect URL to `https://<your-host>/api/banksync/callback`.
4. Configure env (`backend/.env`):
   ```
   BANKSYNC_ENCRYPTION_KEY=<fernet key>         # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ENABLEBANKING_APP_ID=<application id>
   ENABLEBANKING_PRIVATE_KEY_PATH=/secure/path/private.pem   # or ENABLEBANKING_PRIVATE_KEY=<PEM>
   ENABLEBANKING_REDIRECT_URL=https://<your-host>/api/banksync/callback
   ```

`BANKSYNC_ENCRYPTION_KEY` encrypts the stored aggregator session tokens at rest
(master key kept outside the DB). Without these settings the bank-sync endpoints
return a clear 503 and the rest of the app is unaffected.

### How it works
- Consent flow: `POST /api/banksync/connections/start` → bank SCA (browser) →
  public `GET /api/banksync/callback` → encrypted session stored.
- `POST /api/banksync/connections/{id}/sync` polls transactions with a rolling
  overlap window and **idempotent upsert** (dedupe by the bank's `entry_reference`,
  or a composite hash when none), then runs the categorization cascade on the new
  rows. Re-running a sync imports nothing new.
- **Consent expires every ~90–180 days** — the UI shows the expiry and a
  Reconnect action. Italian gotchas: many banks allow only one active consent per
  provider, and some (UniCredit, Mediolanum, CA, BBVA) don't expose credit-card
  accounts over PSD2.

## Tests

```bash
uv run python manage.py test under_backend.apps.finance under_backend.apps.banksync
```
