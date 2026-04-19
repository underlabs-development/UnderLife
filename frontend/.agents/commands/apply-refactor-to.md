Apply a refactoring pattern extracted from current branch changes to the referenced files.

## 1. Analyze Current Changes

- Run `git diff main...HEAD` to see all changes made
- Identify the refactoring pattern by analyzing:
  - What was renamed/moved
  - What structure changed
  - What imports were updated
  - What types/interfaces were modified

## 2. Extract Pattern

Document the identified pattern:

| Aspect            | Before | After |
| ----------------- | ------ | ----- |
| File location     | ?      | ?     |
| Naming convention | ?      | ?     |
| Import paths      | ?      | ?     |
| Type definitions  | ?      | ?     |
| Code structure    | ?      | ?     |

## 3. Validate Referenced Files

For each `@referenced-file`:

- Check if the file matches the "Before" pattern
- Confirm the refactor is applicable
- List specific changes that will be made

## 4. Apply Refactor

For each validated file:

- Apply the same transformations
- Update imports
- Rename types/variables consistently
- Preserve existing business logic

## 5. Verify

- Run `pnpm tsc --noEmit` to verify no type errors
- Run `pnpm lint` to check for lint issues
- Show summary of changes made

## Output Format

### Pattern Detected

[Description of the refactoring pattern]

### Files Modified

| File | Changes Applied |
| ---- | --------------- |
| ...  | ...             |

### Verification

| Check      | Status |
| ---------- | ------ |
| TypeScript | 🟢/🔴  |
| ESLint     | 🟢/🔴  |
