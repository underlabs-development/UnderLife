---
name: commit-message
description: Use whenever drafting a git commit message or PR title for lexroom-backend. The gitlint pre-commit hook will reject anything that doesn't match the format.
---

# Commit message format (enforced by gitlint)

```
type(TICKET-###): description
```

## Allowed types
`build`, `bump`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`

## Ticket prefix
- Jira/Linear-style: `LEX-###`, `INFRA-###`, etc.
- For work without a ticket (hotfix, chore, bump), the scope is still required. Recent examples from `git log`: `fix:` without scope has been accepted for infra-only fixes, but prefer a ticket when one exists.

## Good
- `feat(LEX-1234): add user profile endpoint`
- `fix(INFRA-567): correct database connection timeout`
- `refactor(LEX-3256): stabilize module ordering`

## Bad
- `Added user profile endpoint` — no type
- `feat: add thing` — no ticket scope
- `FEAT(LEX-1): thing` — type must be lowercase
- `feat(LEX-1): Add thing.` — description must be lowercase, no trailing period

## Subject line
- ≤ 72 chars.
- Lowercase start, imperative mood ("add", not "added"/"adds").
- No trailing period.

## Body (optional)
- Blank line between subject and body.
- Explain *why*, not *what*. The diff shows what.

## Never
- Never pass `--no-verify` or `-n` to `git commit` — it bypasses gitlint and other hooks. If a hook fails, fix the problem, re-stage, and commit again (new commit, not `--amend` unless the user asks).
