## 1. Firestore Indexes — clarification (no code change needed now)

You're right that we're in MVP. Here's the honest state:

- Firestore **auto-creates single-field indexes** for every field. All our current queries that filter on a single field (e.g. `where("userId","==",...)`, `where("isActive","==",true)`, `where("assignedAdminId","==",adminId)`) work out of the box with **zero index configuration**.
- A **composite index** is only required when a query combines **multiple `where` filters on different fields**, OR mixes `where` with `orderBy` on a different field. Today we have a few of those:
  - `users` where `role == admin` AND `gender == X` (assignment)
  - `users` where `role == student` AND `gender == X` (load balance)
  - `notifications` where `userId == X` AND `isRead == false`
  - `approvals` where `adminId == X` AND `status == pending`

Firestore handles these gracefully: the **first time** such a query runs in production, the SDK throws a `failed-precondition` error containing a **direct link** to auto-create the needed composite index — one click in the Firebase console. For an MVP with a tiny dataset this is fine; the queries also often succeed without a composite index when result sets are small.

**Plan for indexes:**
- **MVP (now):** do nothing. If/when a query throws the index error, click the link Firebase gives us. No code work required.
- **Next phase (pre-launch hardening):** add a `firestore.indexes.json` file checked into the repo and deploy via Firebase CLI so indexes are reproducible across environments. Not needed yet.

So: **we're not "ignoring" indexes — Firestore is doing the right thing automatically for MVP scale.**

## 2. Fix Forgot Password (currently just shows a toast)

### What's broken
`src/routes/login.tsx` has:
```ts
onClick={() => toast.info(t("auth.forgotPassword"))}
```
That just toasts the label — no email is sent.

### Fix — minimal, MVP-appropriate

**a) `src/lib/auth-context.tsx`**
- Import `sendPasswordResetEmail` from `firebase/auth`.
- Add `resetPassword(email: string): Promise<void>` to the `AuthCtx` interface and the context `value`. It calls `sendPasswordResetEmail(auth, email.trim().toLowerCase(), { url: window.location.origin + "/login" })` and wraps errors with `friendlyAuthError`.
- Extend `friendlyAuthError` map with `auth/missing-email` → "Please enter your email address first."

**b) `src/components/forgot-password-dialog.tsx` (new)**
- Small shadcn `Dialog` containing one `IconInput` (email, `Mail` icon) + submit button.
- On submit calls `resetPassword(email)`, shows `toast.success(t("auth.resetSent"))`, closes dialog. Pre-fills with the email already typed on the login form (passed via prop).
- Loading state with `Loader2` while sending.

**c) `src/routes/login.tsx`**
- Replace the `toast.info(...)` button with one that opens the dialog (`useState` for open).
- Pass current `email` as the initial value so users don't retype.

**d) i18n keys (en / am / om)** — add:
- `auth.forgotPasswordTitle` — "Reset your password"
- `auth.forgotPasswordSub` — "Enter your account email and we'll send you a reset link."
- `auth.sendResetLink` — "Send reset link"
- `auth.resetSent` — "Reset link sent. Check your email."
- `auth.cancel` — "Cancel"

### Files touched
- edit `src/lib/auth-context.tsx`
- edit `src/routes/login.tsx`
- create `src/components/forgot-password-dialog.tsx`
- edit `src/i18n/locales/en.ts`, `am.ts`, `om.ts`

### Notes
- Firebase handles the entire reset flow (hosted page) — no `/reset-password` route needed on our side. The `url` we pass is just where the user lands **after** they reset, so we send them back to `/login`.
- Make sure the deployed domain is listed in **Firebase Auth → Settings → Authorized domains** (already required for sign-in, so this is usually already set).