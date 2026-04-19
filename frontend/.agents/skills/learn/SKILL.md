---
name: learn
description: Save a learning from a dev instruction or correction. Write-only — no reading, no dedup checks.
allowed-tools: Bash(bash .agents/scripts/append-rule.sh *)
---

# Learn

Persist a learning to `.agents/learnings/`. Devs will review and promote entries to canonical rules.

## Steps

1. **Classify** — pick the category that best fits:
   - `strategy`: architectural or cross-cutting rules
   - `pattern`: specific code patterns or component structures
   - `pitfall`: things to avoid, prohibited actions, common mistakes
2. **Write** — run the script with the category and a concise, actionable statement:
   ```bash
   bash .agents/scripts/append-rule.sh <category> "<rule>"
   ```
3. **Report** — reply with a single line confirming what was saved.
