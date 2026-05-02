# Automatic monthly rollover — MVP-friendly (no infra you need to run)

## How it works **today** (the honest answer)

Your "automatic" rollover isn't really automatic. In `src/lib/auth-context.tsx` (lines 161–179), `ensureCurrentMonth()` runs **only when a super-admin opens the app**. If no super-admin logs in on the 1st, students keep seeing the old month. That's the visibility gap you're feeling.

## What you want

1. New month created automatically on the **1st of every month**.
2. Students see it on their portal immediately.
3. Deadline still driven by `settings.global.collectionDeadlineDay` (28 / 29 / 30, clamped).
4. Countdown comes later (out of scope; this plan ensures `dueDate` is reliably set so countdown will Just Work).

## The fix — two layers, no infra to manage

### Layer 1 (primary): Free external cron → your app's HTTPS endpoint

Since you have no cron service, we use **cron-job.org** — free, no credit card, takes 2 minutes to set up. It hits a public URL on a schedule. We just expose one secret-protected endpoint in your app.

**New endpoint** (TanStack server route): `src/routes/api/public/cron/rollover-month.ts`

What it does:
- Reads `x-cron-secret` header, compares to `CRON_SECRET` env var. If it doesn't match → `401`.
- Initializes Firebase Admin SDK (server-side, bypasses Firestore rules).
- Reads `settings/global` → gets `collectionDeadlineDay`.
- Computes `YYYY-MM` for the current Addis-time date.
- Creates the month doc if missing (with `startDate` = day 1, `dueDate` = clamped deadline day, `isActive: true`), and deactivates any other active month.
- Returns `{ ok: true, monthId, created }`.

**Setting up cron-job.org** (you do this once after I deploy the endpoint):
1. Sign up at cron-job.org (free, email only).
2. New cronjob → URL: `https://project--5b69f9a2-d072-4e94-ad44-782da6a23233.lovable.app/api/public/cron/rollover-month`
3. Method: `POST`. Add header: `x-cron-secret: <the value you give me>`
4. Schedule: **day 1 of every month, 00:05, timezone Africa/Addis_Ababa**.
5. Save. Done.

I'll give you exact click-by-click instructions when the endpoint is live.

### Layer 2 (safety net): Broaden the in-app trigger

Even with cron, networks fail. So in `src/lib/auth-context.tsx`, change the rollover effect to fire for **any logged-in user** (not just super-admin). Then in `src/lib/months.ts`, swallow `permission-denied` silently — students just no-op (they can't write `months/*` per Firestore rules anyway), but **any admin or super-admin** opening the app will trigger the rollover if cron somehow missed.

Combined: cron does it at 00:05. If cron fails, the first staff member who opens the app fixes it. If neither happens, students at worst see "no active month" until someone visits — same as today, but now with a much wider safety net.

### Layer 3 (already works, no change needed)

`useActiveMonth()` in `src/lib/data-hooks.ts` already uses Firestore `onSnapshot`. The instant the month is created, every student's dashboard updates within ~1s with no refresh.

## Files to change / create

**New**
- `src/routes/api/public/cron/rollover-month.ts` — secret-gated POST endpoint.
- `src/lib/firebase-admin.server.ts` — lazy-init Firebase Admin (server-only, never bundled to client).

**Edit**
- `src/lib/auth-context.tsx` — trigger `ensureCurrentMonth` for any logged-in profile, not just super-admin.
- `src/lib/months.ts` — catch `permission-denied` and treat as no-op so students don't see errors in console.
- `package.json` — add `firebase-admin`.

**Secrets I'll request after you approve** (via the secrets UI):
- `CRON_SECRET` — random string, you generate it (or I'll suggest one).
- `FIREBASE_ADMIN_PROJECT_ID` = `humsj-charity-portal`
- `FIREBASE_ADMIN_CLIENT_EMAIL` — from a Firebase service account JSON.
- `FIREBASE_ADMIN_PRIVATE_KEY` — from the same JSON.

I'll walk you through generating the service account key in Firebase Console (Project settings → Service accounts → Generate new private key) when we get there. Takes ~1 minute.

## What stays the same

- Deadline logic (28/29/30, clamped to month length).
- Manual "Run rollover now" button in `super.settings.tsx`.
- Month id format `YYYY-MM`, naming, all student UI.

## Out of scope (next phase)

- Countdown widget (you mentioned for later).
- Push/email notifications when a new month opens.

## Why this is the right call for MVP

- **Zero infra** you maintain — cron-job.org is free and reliable enough for a once-a-month job.
- **Belt-and-suspenders**: if cron fails one month, an admin opening the app still triggers it.
- **Real-time student visibility** is already wired via `onSnapshot`, no extra work.
- **Migration path**: when you outgrow cron-job.org, swap it for Cloud Scheduler / GitHub Actions cron — same endpoint, same secret, no code change.
