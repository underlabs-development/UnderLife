---
category: strategy
---

Before running pnpm check:all, pnpm lint, pnpm lint:strict, or pnpm typecheck, run ESLint autofix on every source file you created or edited: pnpm exec eslint <paths> --fix (same rules as lint:fix). If you touched many areas or want a full pass, run pnpm lint:fix first.
