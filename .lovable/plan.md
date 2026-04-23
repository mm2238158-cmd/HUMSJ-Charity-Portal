# HUMSJ Charity Portal — Mobile-First PWA

A production-grade donation/fintech-style portal for Haramaya University Muslim Students Jeme'a, with role-based experiences(access), multi-language support, and Firebase-ready architecture.

## Brand & Design System

- **Logo**: HUMSJ logo placed in `src/assets/`, used in splash, login, header, and PWA icons
- **Primary color**: Teal extracted from logo (~`oklch(0.62 0.10 195)`); soft teal gradient accents
- **Typography**: Modern sans (Inter); generous spacing; rounded `12–16px` corners; soft shadows
- **Motion**: Subtle transitions, button press feedback, skeleton loaders, toast feedback
- **Status badges**: Green=approved, amber=pending, red=rejected, orange=late

## Navigation & Layout

- **Mobile (<768px)**: Fixed bottom nav (Home, History/Users, Notifications, Settings); top header with logo + notification bell
- **Desktop (≥768px)**: Collapsible sidebar (shadcn) with same items; top bar with bell + profile
- Cards on mobile auto-promote to tables on desktop

## Internationalization

- `react-i18next` with English (default), Amharic (አማርኛ), Afaan Oromo
- Switcher in Settings; preference persisted to localStorage and synced to user profile in Firestore
- All UI strings extracted to translation files

## Theming

- Light / Dark / System modes via `next-themes` style provider
- Custom teal-based palette in both modes; persisted per user

## Authentication (Firebase)

- Firebase Auth (email/password,Google) wired with provided config
- Login + Registration screens; registration captures fullName, phone, gender, and assigns `role: student` by default
- Auth guard via TanStack Router `_authenticated` layout; role-guarded sub-layouts (`_student`, `_admin`, `_superadmin`)
- Auth context provides `user`, `role`, `signIn`, `signUp`, `signOut`

## Firebase Integration

- `src/lib/firebase.ts` initializes app, auth, Firestore, Storage (analytics gated to browser)
- Collections matching your schema: `users`, `months`, `contributions`, `notifications`, `settings`
- Screenshot uploads → Firebase Storage at `contributions/{userId}/{monthId}.jpg`, URL stored in contribution doc
- Real-time listeners on contributions, notifications, and active month
- One-contribution-per-user-per-month enforced in UI (button disabled if exists)

## Student Experience

- **Dashboard**: Active month card with status (Paid/Pending/Late), summary tiles (total contributed, last payment, months active), quick "Pay now" CTA
- **Pay Contribution**: Amount input (prefilled from settings.contributionAmount), drag/drop or tap-to-upload screenshot with preview, submit with progress indicator
- **History**: Cards on mobile / table on desktop — month, amount, status, submitted date, rejection reason if any
- **Notifications**: List with unread dots, mark-as-read on tap.

## Admin Experience

- **Dashboard**: Tiles for assigned users, pending approvals, approved this month, monthly trend
- **Assigned Users**: List/table of only `assignedAdminId === currentAdmin`
- **Payment Approval queue**: Pending contributions with screenshot lightbox preview, Approve/Reject buttons; reject opens reason modal

## Super Admin Experience

- **Dashboard**: Total users, total contributions this month, system health overview, role breakdown chart
- **Admin Management**: Create admin (promote user), remove admin role, reassign students between admins
- **User Management**: Searchable/filterable table of all users; activate/deactivate; view contribution history per user
- **Settings (global)**: contributionAmount, reminderDaysBefore, allowLatePayment, manage months (create new month, set due date, activate)

## Settings (all roles)

- Profile (photo,name, phone — gender + role read-only)
- Language switcher (3 languages)
- Theme toggle (Light/Dark/System)
- Notification preferences (toggle reminders)
- Logout

## Notifications

- Bell icon in header with unread badge count
- Dropdown on desktop / full page on mobile
- Read/unread states; auto-mark on view

## PWA

- Web manifest with HUMSJ logo (multiple icon sizes), `display: standalone`, teal theme color → installable on home screen
- `vite-plugin-pwa` with service worker for offline cache (production build only, disabled in dev/preview to avoid Lovable iframe issues)
- Note: Offline + install behavior testable only in published deployment

## Smart UX

- Skeleton loaders for all data-fetching views
- Empty states with helpful illustration + CTA
- Inline form validation with Zod schemas
- Toast feedback (sonner) on all mutations
- Error boundaries per route

## Mock vs Live Data

- Initial run uses Firebase live; if collections empty, a one-time seed function (super-admin only button in Settings → "Seed demo data") populates 50+ mock users, 6 months, mixed-status contributions for testing

## Tech Stack

TanStack Start • Firebase (Auth + Firestore + Storage + Analytics) • Tailwind v4 • shadcn/ui • react-i18next • vite-plugin-pwa • zod • sonner • lucide-react