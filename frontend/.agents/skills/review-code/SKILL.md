---
name: review-code
description: Review React/Next.js code for architecture compliance, component standards, and i18n rules. Use when reviewing PRs, examining code changes, or when the user asks for a code review.
---

# Code Review Skill

Reviews code against project rules. This skill orchestrates the review process using the project's rules as the single source of truth.

## Rules Reference

Before reviewing, read and apply these rules:

1. **Architecture** → `.agents/rules/architecture.md`
2. **Component Standards** → `.agents/rules/component-standards.md`
3. **Translations** → `.agents/rules/translations.md`

## Review Process

### Step 1: Gather Changes

Identify all files to review:
- For PRs: use `git diff` against the base branch
- For manual review: check the files provided by the user

### Step 2: Apply Rules

For each file, verify compliance with the referenced rules:

| Area                      | Rule File                | Key Checks                                       |
| ------------------------- | ------------------------ | ------------------------------------------------ |
| Folder structure & naming | `architecture.md`        | Folder responsibilities, file naming conventions |
| Component design          | `component-standards.md` | Internal order, naming, TypeScript, styling      |
| Translations              | `translations.md`        | Flat keys, kebab-case, no hardcoded strings      |

### Step 3: Categorize Issues

- 🔴 **Critical** — Must fix before merge
  - Type safety violations
  - Architecture violations
  - Hardcoded strings
  - Nested translation keys

- 🟡 **Warning** — Should fix
  - Wrong component internal order
  - Naming convention violations
  - Style issues

- 🟢 **Suggestion** — Nice to have
  - Performance optimizations
  - Code organization improvements

## Output Format

```
## Review Summary

### 🔴 Critical Issues
- [file:line] Description → Rule violated

### 🟡 Warnings
- [file:line] Description → Suggested fix

### 🟢 Suggestions
- [file:line] Description

### ✅ Approved
Files without issues.
```

## Quality Gate

Code is **not mergeable** if any critical issue exists. Refer to the "Quality Criteria" section in `architecture.md` for the complete list.
