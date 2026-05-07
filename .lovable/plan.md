## Plan

### 1. Slim dashboards + dedicated Analytics page (desktop/tablet)

**Super-Admin dashboard (`src/routes/super.index.tsx`)**: keep only high-priority tiles:
- Total users
- Contributed this month
- Pending approvals
- Active month name

Remove the bulk (all-time, rejected, participation %, avg, role breakdown, admins/students counts) and move them to the new Analytics page.

**Admin dashboard (`src/routes/admin.index.tsx`)**: keep current 3 tiles (already lean). Add link to Analytics.

**New route `src/routes/super.analytics.tsx`** and **`src/routes/admin.analytics.tsx`**:
- Full analytics: all-time totals, this-month totals, approved/rejected counts, participation rate, avg per student, role breakdown, contribution trend by month (last 6 months bar list), top contributors (top 5).
- Admin variant scoped to their assigned students only.

**Nav (`src/components/app-nav.tsx`)**: add Analytics item with `BarChart3` icon for `super-admin` and `admin`. Hide it on mobile bottom nav (since user requested >mobile only) by filtering items based on a `desktopOnly` flag — render only on `DesktopSidebar`.

### 2. "View" column for student analytics

**`src/routes/super.users.tsx`** and **`src/routes/admin.users.tsx`**: add a "View" action column (eye icon button) on each row (and a button on mobile cards).

Clicking opens a new shared component **`src/components/student-analytics-dialog.tsx`** (Dialog) showing:
- Profile summary: name, email, phone, gender, role, status, assigned admin name
- Total approved contribution amount (all-time, ETB)
- Contributions this month (status + amount)
- Counts: approved / pending / rejected / late
- Average per month, participation streak (consecutive months contributed)
- Recent contributions table (last 10): month, amount, status, submittedAt, approvedAt

Data via `useUserContributions(userId)` + `useMonths()`.

### 3. Sticky sidebar (no scroll)

**`src/components/app-nav.tsx`** `DesktopSidebar`: change `<aside>` to `sticky top-0 h-screen overflow-y-auto` so it stays in view as the main content scrolls. Keep current width and styling.

### 4. i18n

Add keys to `en.ts`, `am.ts`, `om.ts`:
- `nav.analytics`
- `superAdmin.viewStudent`, `superAdmin.studentAnalytics`
- `analytics.totalApproved`, `analytics.thisMonth`, `analytics.recentContributions`, `analytics.topContributors`, `analytics.trend`, `analytics.avgPerMonth`, `analytics.streak`, `analytics.lateCount`

### Files
- modify: `src/routes/super.index.tsx`, `src/routes/admin.index.tsx`, `src/routes/super.users.tsx`, `src/routes/admin.users.tsx`, `src/components/app-nav.tsx`, locales (en/am/om)
- create: `src/routes/super.analytics.tsx`, `src/routes/admin.analytics.tsx`, `src/components/student-analytics-dialog.tsx`
