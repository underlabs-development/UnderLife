# BugBot Review Rules

**Canonical conventions live in `.agents/rules/*.md`.** Read them before reviewing. The rules below are either (a) pointers into those files with PR-review metadata, or (b) review-only rules that do not exist elsewhere.

---

## Canonical rules (see `.agents/rules/`)

When reviewing a PR, cross-check it against the canonical rule files. These are the single source of truth — if a rule here conflicts with a canonical file, the canonical file wins.

- `.agents/rules/architecture.md` — folder responsibilities, file naming (hooks/models/stores/contexts/configs), `src/pages` structure (`<Page>/<PageHeader>/<PageBody>/<PageFooter>`), no edits to `src/lib/lexroom-ui/components/ui/**` (shadcn atoms), no business logic in `src/core/layout/**`, no raw third-party exposure from `src/lib/**`, no direct icon-library imports (use `src/lib/icons`).
- `.agents/rules/component-standards.md` — component design, naming, coding standards.
- `.agents/rules/translations.md` — flat kebab-case translation keys in `src/messages/*.json`, no nested objects, no dots, no camelCase.

For any violation of the above, open a Bug with:

- **Title**: `<rule-file>: <short description>` (e.g. `architecture.md: shadcn component modified`).
- **Body**: quote the offending snippet and link the relevant section of the referenced file.
- **Severity**: **blocking** for architecture / naming / i18n violations.
- **Labels**: `architecture` | `naming` | `i18n` — pick the matching one.

---

## Review-only rules

These are PR-review-specific rules that are **not** in `.agents/rules/`. Keep them inline here.

### Security Review

If the PR modifies files in `{src/features/auth/**, src/features/payments/**, src/lib/**/api/**}`, then:
- Add a non-blocking Bug titled "Security-sensitive area modified"
- Body: "This PR touches authentication, payments, or API code. Please ensure a security review is performed."
- Apply label "security"

### JavaScript Files

If the PR adds new files with `.js` or `.jsx` extension in `{src/**}`, then:
- Add a blocking Bug titled "JavaScript file in TypeScript project"
- Body: "This project uses TypeScript exclusively. Convert `.js/.jsx` files to `.ts/.tsx`."
- Apply label "typescript"

### Any Type Usage

If any changed file contains `/:\s*any(?!\w)/` without a TODO comment on the same or previous line, then:
- Add a blocking Bug titled "Untyped `any` usage"
- Body: "Usage of `any` type found without justification. Add proper typing or include a TODO comment explaining why `any` is necessary."
- Apply label "typescript"

### Hardcoded User-Facing Strings

If any changed `.tsx` file contains hardcoded Italian or English user-facing strings in JSX (not in imports, types, or technical strings), then:
- Add a blocking Bug titled "Hardcoded user-facing string"
- Body: "User-facing strings must use the translation system. Use `const t = useTranslations()` and `t('key-name')` instead of hardcoded text."
- Apply label "i18n"

### Event Handler Naming

If any changed `.tsx` file defines event handler functions that don't follow the `handle*` prefix pattern (e.g., `clickHandler` instead of `handleClick`), then:
- Add a non-blocking Bug titled "Event handler naming convention"
- Body: "Event handlers should use the `handle` prefix. Example: `handleClick`, `handleSubmit`, `handleChange`."
- Apply label "naming"

### Inline Styles

If any changed `.tsx` file contains `/style=\{\{/` (inline style object), then:
- Add a non-blocking Bug titled "Inline styles detected"
- Body: "Avoid inline styles. Use the project's styling system (CSS modules or Tailwind classes) instead."
- Apply label "styling"

### Forced Tailwind Measures

If any changed `.tsx` file contains Tailwind classes with forced pixel or rem values like `/\[[\d.]+(px|rem)\]/`, then:
- Add a non-blocking Bug titled "Forced Tailwind measure detected"
- Body: "Avoid Tailwind classes with forced px/rem values (e.g., `w-[24px]`). Use standard Tailwind spacing utilities when possible."
- Apply label "styling"

### Console Statements

If any changed file in `{src/**}` contains `/console\.(log|warn|info|debug)\s*\(/`, then:
- Add a non-blocking Bug titled "Console statement in production code"
- Body: "Remove `console.log/warn/info/debug` statements before merging. Use proper error handling or logging service instead."
- Apply label "quality"

### TODO Without Issue Reference

If any changed file contains `/(?:^|\s)(TODO|FIXME)(?:\s*:|\s+)/` without an issue reference pattern `/#\d+|[A-Z]+-\d+/`, then:
- Add a non-blocking Bug titled "TODO/FIXME without issue reference"
- Body: "TODO/FIXME comments should reference a tracked issue. Example: `TODO(#1234): ...` or `TODO(LEX-123): ...`"
- Apply label "quality"

### Large Components

If any changed `.tsx` component file exceeds 150 lines, then:
- Add a non-blocking Bug titled "Large component detected"
- Body: "Components should be under 150 lines for maintainability. Consider splitting into smaller, focused components."
- Apply label "quality"

### Section Comments in Components

If any changed `.tsx` file contains section comment patterns like `/\/\/\s*[-=]{3,}|\/\*\s*[-=]{3,}/`, then:
- Add a non-blocking Bug titled "Section comments in component"
- Body: "Do not use section comments to split components. If a component needs sections, consider splitting it into smaller components."
- Apply label "quality"

### React Key Using Index

If any changed `.tsx` file contains `/key=\{(?:index|i|idx)\}/`, then:
- Add a non-blocking Bug titled "React key using array index"
- Body: "Avoid using array index as React key. Use a unique identifier from the data instead for proper reconciliation."
- Apply label "performance"

### Agents Learnings Overflow

If the PR modifies `{.agents/learnings/pitfalls.md, .agents/learnings/patterns.md, .agents/learnings/strategies.md}` and the modified file contains 10 or more lines matching `/^\- \[[a-z]+-\d{5}\]/` (indexed rule entries), then:
- Add a non-blocking Bug titled "Agents learnings need review"
- Body: "One of the learnings files (`pitfalls.md`, `patterns.md`, or `strategies.md`) has reached 10+ entries. Consider promoting mature learnings to the canonical rule files in `.agents/rules/` and removing them from learnings."
- Apply label "agents"

### Dependencies

If the PR modifies `{package.json, pnpm-lock.yaml}` and adds new dependencies, then:
- Add a non-blocking Bug titled "New dependency added"
- Body: "New dependencies detected. Please include justification in the PR description explaining why this dependency is needed."
- Apply label "dependencies"
