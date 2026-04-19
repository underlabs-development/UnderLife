---
category: pitfall
---

pnpm PATH: pnpm may not be on PATH in the shell. Use the full path or source nvm before running pnpm commands. Never fall back to pnpm lint:fix (whole repo) when the plan targets specific files — always scope eslint --fix to the exact files created or edited to avoid out-of-scope changes in the PR.
