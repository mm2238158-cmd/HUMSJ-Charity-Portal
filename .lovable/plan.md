# Mobile UI Fixes — Bottom Nav, Super Users Table, and Responsive Polish

## What's broken (and why)

### 1. Bottom tab bar wraps to two rows on mobile (super-admin)
`src/components/app-nav.tsx` hardcodes `grid-cols-4` in `BottomNav`, but the super-admin role exposes **5** items (Dashboard, Approvals, Users, Admins, Settings). With only 4 columns, the 5th item drops to a second row.

### 2. `/super/users` Action column overflows on mobile
The page renders a single `<table>` with 6 columns (Name, Email, Gender, Role, Status, Actions). At 390px the row exceeds the viewport — the Action button gets pushed off-screen or clipped. The `<table>` wrapper does scroll horizontally but the Action button is then unreachable without scrolling, which is what the user is seeing.

### 3. Other responsive issues found while auditing
- `/super` dashboard tiles use `grid-cols-2` with 5 tiles → last tile is alone on its row at mobile (cosmetic, but ugly). Switch to a smarter layout.
- `/super/admins` "Promote student" table only shows the assignment Select on `sm:` and up, but the row still uses fixed `px-4 py-3` cells that crowd on 390px. Will tighten paddings.
- Status badges in `/super/contributions` cards (`late` + status side-by-side) can wrap awkwardly inside the header row on narrow screens. Will allow the badges to wrap onto a second line cleanly.

## Plan

### Fix A — Bottom nav adapts to item count
In `src/components/app-nav.tsx`, replace the hardcoded `grid-cols-4` with a dynamic class based on `items.length`:
- 4 items → `grid-cols-4`
- 5 items → `grid-cols-5`
- (future-proof) fallback to `style={{ gridTemplateColumns: \`repeat(${items.length}, minmax(0,1fr))\` }}`

Also slightly reduce label font size to `text-[10px]` and icon size on 5-column layout so labels don't truncate at 360-390px.

### Fix B — Mobile-friendly `/super/users`
Mirror the pattern already used in `/admin/users`:
- **Mobile (<md):** render a stacked **card list** (avatar/initial + name + email + gender chip + role + status, with the Activate/Deactivate button as a full-width secondary button at the bottom of each card). Mismatch warning shown inline.
- **Desktop (md+):** keep the existing table.

### Fix C — Super dashboard tile grid
In `src/routes/super.index.tsx`, change `grid-cols-2 lg:grid-cols-5` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`. With 5 tiles this gives 2+2+1 on phones (fine) and a clean row of 5 on desktops.

### Fix D — Super admins page table padding
In `src/routes/super.admins.tsx`, change `px-4 py-3` cells to `px-3 py-2` and make the "Promote" button `size="sm"` w-auto (already sm). Also change `<table>` to be wrapped in `overflow-x-auto` for safety.

### Fix E — Contribution card header on mobile
In `src/routes/super.contributions.tsx` line 226, allow the badge group to wrap: change the header `<div className="flex items-center justify-between gap-2">` to allow wrap (`flex-wrap`) and put the badges in a `flex-wrap gap-1 shrink-0` container.

## Files to edit
- `src/components/app-nav.tsx` — dynamic columns
- `src/routes/super.users.tsx` — add mobile card layout
- `src/routes/super.index.tsx` — tile grid breakpoints
- `src/routes/super.admins.tsx` — tighter table padding + horizontal scroll wrapper
- `src/routes/super.contributions.tsx` — badge wrap on narrow screens

## Out of scope
No data, auth, Firebase rules, or business-logic changes. Pure responsive UI.
