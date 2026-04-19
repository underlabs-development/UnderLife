---
paths:
  - "src/features/**/services/**"
  - "**/components/*.tsx"
  - "**/hooks/*.ts"
  - "src/pages/**/*.tsx"
---

# API Layer

## Service Convention

- Hooks wrapping TanStack Query (`useQuery`, `useMutation`) are **services**. They live in `services/` inside each feature.
- Path: `src/features/<feature>/services/use-<action>-service.ts`
- The `hooks/` folder is reserved for UI-specific React hooks that do **not** interact with the API layer.

## TanStack Query as Single Source of Truth

- TanStack React Query is the **only** layer for server state (fetching, caching, sync, loading/error states, invalidation).
- No `useState` + `useEffect` for data fetching. No global stores for server data. No ad-hoc `try/catch` chains.
- Service hooks must return the **raw** `UseQueryResult` / `UseMutationResult`. Never reshape, rename, or cherry-pick fields inside the hook.
- Data mapping (e.g., `query.data?.unread_count`) belongs in the **consumer**.

## Data Transformation

- Use the `select` option of `useQuery` when the consumer needs data in a different shape (mapped, filtered, sorted, reduced).
- `queryFn` must always return the raw server response. `select` is the **only** reshaping allowed inside a service hook.
- Simple field access (`data?.count`) belongs in the component.
- Shared transformations (mapping, filtering, sorting for a specific view) belong in a dedicated service with `select`.
- Combining data from multiple queries belongs in the component or an orchestrating hook.

## Mutation Usage

- Use `.mutate()` (fire-and-forget) in components. No `try/catch` wrapping `mutateAsync()` in UI.
- `.mutateAsync()` is allowed **only** when the next step depends on the mutation result (e.g., navigate with a returned ID).
- `mutationFn` must throw naturally. No catch-and-rethrow, no catch-and-call `options?.onError`.
- `isPending` is the **only** source of truth for mutation loading state. Never duplicate with `useState`.
- Local consumption: destructure with renaming for semantic meaning.
- Passing to children: keep the mutation object intact, let the child destructure.
- Domain components (feature-specific): receive the **entire mutation result** as a single prop.
- Reusable UI components: receive **explicit primitive props** (`onAction`, `isPending`). Must not depend on `UseMutationResult`.

## Error Handling and Toasts

- **Error toasts**: handled globally by `MutationCache.onError`. Never duplicate in components. No `onError` callbacks in components that repeat global error handling.
- **Success toasts**: belong in the consumer component, inside the `onSuccess` callback passed to `.mutate()`.
- No toast calls (`toast.success`, `toast.error`) inside hooks or services.
- Customize or suppress global error behavior via `meta` (`errorToast`, `errorTracking`).
- Analytics calls (e.g., `trackAmplitude`) can stay inside the hook at the `useMutation` definition level.
- Components may use `onSuccess` / `onSettled` for **UI effects** only: success toasts, closing modals, resetting forms, navigating.

## Validation Before Mutation

- All payload validation must happen **before** calling `.mutate()`, never inside `mutationFn`.
- The component validates input, filters invalid data, checks preconditions, then calls `.mutate(validatedPayload)`.
- `mutationFn` receives a validated, ready-to-send payload and only performs the HTTP call.
- No field remapping, no `FormData` construction, no snake_case conversion inside the mutation hook. That logic belongs in the **repository layer**.

## Cache Management

- After a mutation, default to `queryClient.invalidateQueries({ queryKey })`.
- Use `queryClient.setQueryData` **only** when optimistic UI is required.
- Optimistic updates must implement the full `onMutate` (snapshot + optimistic write) / `onError` (rollback) / `onSettled` (revalidate) pattern at the **hook level**, not in UI.
- `staleTime` is configured globally. Feature-specific overrides are allowed at the hook level.
- `refetchOnWindowFocus` is disabled globally.

## Query Key Management

- Every feature must define query keys as **exported constants**.
- Prefer a **query key factory** pattern per feature for parameterized keys.
- Query keys must **never** be hardcoded as inline string arrays in components or hooks.
- Use `as const` for type safety.

## HTTP Clients

- Three semantic clients from `~/lib/api-layer`: `publicHttpClient` (no auth), `httpClient` (Bearer token), `streamClient` (SSE/BFF).
- **No direct import** of `axios` or raw `fetch()` outside `src/lib/network/`.
- All clients share header-injection logic (token, `X-Client-Type`, locale).
- Repositories are the **only consumers** of these clients. Hooks and components never import them directly.
