---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Component Standards

## General

- Avoid unnecessary comments; allowed only TODOs or brief rationale.
- Avoid magic numbers and strings; define constants instead.
- Destructure properties at the beginning of the component
  - Use at most one level of nesting for destructured objects
- Prefer early-return branching at the end of the component over inline boolean checks in JSX

## Component Design

- Prefer Single Responsibility Principle.
- Components should preferably stay under 150 lines.
- No side effects during render; use effects appropriately.
- Do not split components using section comments.

## Component Internal Order (Mandatory)

- Variables
  - Translations
  - Contexts
  - Internal state
  - Refs
- Functions
  - Event handlers (prefix: `handle`)
  - High-level functions
  - Low-level functions
- Effects
- Render

## Function Design

- Small, focused, composable functions.
- Use early returns and guard clauses to minimize nesting.
- Avoid hidden side effects.

## Naming Conventions

- Components, variables, functions: descriptive English names
- Boolean functions: `is` / `has` / `can` prefix
- Event handlers: `handle` prefix
- Callback props: `on` prefix
- Global constants: `UPPERCASE_SNAKE_CASE`

## Types and Props

- Enforce strict TypeScript typing for all props.
- Avoid `any` unless explicitly justified with a TODO.
- Use optional and required props consistently.

## Styling

- Prefer modular CSS or the project styling system.
- Avoid inline styles unless strictly necessary.
- Avoid tailwind classes with forced measures in rem or px unless strictly necessary.
- Use consistent kebab-case class names.

## Performance

- Use `useMemo` and `useCallback` only when justified.
- Avoid unnecessary re-renders.
- Optimize large lists with memoization or virtualization when needed.
- Use React key with id fields

## Testing

- Prefer unit tests for pure functions and critical components.
- Test files must follow the naming convention: `component-name.spec.tsx`.

## Error Handling

- Use standardized error handling patterns.
- Prefer fallback UI where appropriate.

## Component References

- Tabs:
  - Use `src/pages/history/index.tsx` as a design reference
  - Put tabs into main page; avoid wrapping tabs in a separate component
- Tables:
  - Use `src/features/compliance/components/compliance-table.tsx` as a design reference for tables
  - Columns configuration must be inside [...]-table.tsx component
