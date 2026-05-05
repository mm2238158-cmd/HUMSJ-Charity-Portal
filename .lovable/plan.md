## Month management — dynamic ensure + recent/history split

Make the current month appear automatically for everyone (not only super-admins), enforce single-active-month invariant, and expose helpers + a hook to split months into "latest 4" and "history".

### Current state

- `src/lib/months.ts` already has `currentMonthId()`, `clampedDeadlineDay`, and `ensureCurrentMonth()` (transactional, deactivates other active months).
- `ensureCurrentMonth` is currently called only from `auth-context.tsx` and only when the signed-in user is `super-admin`.
- `useMonths()` already returns months ordered by `startDate desc`.
- Firestore rule reality (per existing comment): only super-admins can write to `months`. Regular students/admins can only read.

### Changes

**1. `src/lib/months.ts` — add helpers + hardening**

- Add `splitMonths(months: MonthDoc[]): { recent: MonthDoc[]; history: MonthDoc[] }` returning `recent = months.slice(0, 4)` and `history = months.slice(4)`. Assumes input is already sorted desc (matches `useMonths`).
- Keep `ensureCurrentMonth` but make it idempotent-cheap: the existing early-return when month exists & no stale active months is correct; no change needed beyond a safety try/catch wrapper for permission-denied (so non-super-admin callers don't throw).
- Export a `safeEnsureCurrentMonth(...)` wrapper that swallows `permission-denied` errors. This lets us call it from any signed-in context without crashing students/admins.

**2. `src/lib/auth-context.tsx` — broaden the trigger**

Currently:

```ts
if (!profile || profile.role !== "super-admin") return;
```

Change to: run for *any* signed-in profile, but use `safeEnsureCurrentMonth`. Super-admins will succeed and create/repair the month; everyone else will silently no-op if rules block them, but will still benefit when a super-admin has already created it.

This satisfies "whenever the app loads (or user accesses dashboard) → check & create" without needing cron, and respects the security rule that only super-admins write.

> Note (MVP honesty): with current Firestore rules, the *creation* still only actually happens when a super-admin opens the app. If no super-admin signs in for several months, the month won't auto-create for students. Two options to truly cover the edge case:
>
> - (a) loosen the rule so any authenticated user can `create` a month doc whose ID equals the current `YYYY-MM` and `isActive=true` (validated server-side via rules).
> - (b) keep super-admin-only writes (recommended for MVP) and accept that the super-admin signing in once a month is the trigger.
>
> Default plan = (b). If you want (a), say so and I'll add the rule and remove the `safeEnsureCurrentMonth` swallow.

**3. `src/lib/data-hooks.ts` — add `useRecentAndHistoryMonths()**`

Thin wrapper over `useMonths()` that returns `{ recent, history, all, loading }` using `splitMonths`. Keeps existing `useMonths` untouched so nothing else breaks.

**4. `src/routes/app.history.tsx` — use the split**

- Replace the flat `items` list with two sections:
  - **Recent** — contributions whose `monthId` is in `recent` months.
  - **History** — the rest.
- Section headers use existing i18n keys; add two new keys: `student.recentMonths` ("Recent months") and `student.olderHistory` ("Older history") in `en.ts`, `am.ts`, `om.ts`.
- Keep the empty-state and mobile/desktop layouts as-is, just rendered twice.

**5. Edge cases handled**

- First-time system / no months: `useMonths` returns `[]`, `splitMonths` returns `{ recent: [], history: [] }`, history page shows the existing empty state.
- Missing months (gap): `ensureCurrentMonth` only creates the *current* one and deactivates stale active months — gaps in between are left absent (correct, no fake data).
- Multiple tabs / race: `runTransaction` already prevents two active months.
- Students with no super-admin online: see note above; default = accept.

### Files

- edit `src/lib/months.ts` — add `splitMonths`, add `safeEnsureCurrentMonth`.
- edit `src/lib/auth-context.tsx` — call `safeEnsureCurrentMonth` for any signed-in profile.
- edit `src/lib/data-hooks.ts` — add `useRecentAndHistoryMonths`.
- edit `src/routes/app.history.tsx` — render Recent + History sections.
- edit `src/i18n/locales/en.ts`, `am.ts`, `om.ts` — add `student.recentMonths`, `student.olderHistory`.

### Confirm before I implement

1. Keep super-admin-only writes (option b) &
2. leave it flat