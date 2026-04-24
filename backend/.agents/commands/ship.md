---
description: Finish a task — run reviewer, run /check, then propose a commit message. Does not commit or push without confirmation.
---

Do the following in order:

1. Launch the `lexroom-reviewer` agent on the current diff. Relay its Blockers/Should-fix sections.
2. If there are no blockers, run the `/check` command.
3. If checks pass, draft a commit message using the `commit-message` skill rules based on the diff.
4. Show me: (a) reviewer output, (b) check result, (c) the proposed commit subject + body.
5. **Stop.** Do not run `git commit` or `git push` until I say so.
