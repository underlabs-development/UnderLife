Execute pre-merge checks on the current branch against main:

## 1. Analyze Changes

- Run `git diff main...HEAD --name-only` to list changed files
- Run `git log main...HEAD --oneline` to understand commit history

## 2. Build

Verify the project compiles:

- Run `pnpm build` for build verification
- Check build log to verify blockers
- If any fails, report errors and stop

## 3. Code Review

Use @review-code skill to review all changed files:

- Architecture compliance
- Component standards
- Translation rules

## 4. Unused Files Detection

Identify orphaned files that may no longer be needed:

- For each deleted import/reference in changed files, verify if the target file is still used elsewhere
- Search for components, utilities, or modules that lost their last reference
- Check for files in the same directory as deleted files that might be orphaned
- Report files with zero imports across the codebase

## 5. Translations Sync (i18n)

Align labels with Tolgee server:

- Run `pnpm i18n:push:dev:add-keys` to push new keys
- Run `pnpm i18n:pull:dev` to pull updated translations
- Report any changes in `src/messages/*.json`

## Required Output

| Check | Status |
|-------|--------|
| TypeScript | 🟢/🔴 |
| ESLint | 🟢/🔴 |
| Build | 🟢/🔴 |
| Code Review | 🟢/🟡/🔴 |
| Unused Files | 🟢/🟡 |
| i18n Sync | 🟢/🔴 |

### Issues Found

- 🔴 **Critical**: [must fix before merge]
- 🟡 **Warning**: [should fix]
- 🟢 **Suggestion**: [nice to have]
