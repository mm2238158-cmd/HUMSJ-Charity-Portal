
# Auth fixes — Firestore rules, Google button, password toggle, email verification

## 1. Firestore "Missing or insufficient permissions" (REQUIRES YOUR ACTION)

**Root cause:** Your Firestore database is in **locked mode** — the default rules deny all reads/writes. Firebase Auth creates the user successfully, but when our code then tries to write the profile to `users/{uid}`, Firestore rejects it. That's also why no Firestore data appears.

**This cannot be fixed from code.** You must paste rules into the Firebase Console:

1. Go to https://console.firebase.google.com/project/humsj-charity-portal/firestore/rules
2. Replace the rules with the block below and click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Each user can read/create/update their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }

    // Active month + global settings are readable by any signed-in user
    match /months/{monthId} {
      allow read: if request.auth != null;
      allow write: if false; // managed via admin SDK / super-admin tooling later
    }
    match /settings/{docId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // Contributions: students create their own; admins read/update via custom claims later
    match /contributions/{id} {
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid
      );
      allow create: if request.auth != null && request.data.userId == request.auth.uid;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid
                    && resource.data.status == 'pending';
    }

    // Notifications: each user reads their own
    match /notifications/{id} {
      allow read, update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

(Admin/super-admin write access will be added later once we wire Firebase custom claims via a Cloud Function — for now those flows will fail gracefully.)

I'll also harden `auth-context.tsx` so that if the Firestore write still fails, we **roll back the auth user** (`user.delete()`) so no orphan auth account is left behind, and surface a clear toast message instead of silently leaving the user stuck.

**Note on the `postMessage` console warning:** That's a Lovable preview-iframe quirk (the dev tooling posting messages to `lovable.dev` from inside a preview origin). It is unrelated to the permission error and harmless — it disappears in your published deployment.

## 2. Real "Continue with Google" button

Replace the plain outline button with an official-style Google button:
- White background with subtle border in light mode, dark surface in dark mode
- Inline 4-color Google "G" SVG logo (no external image)
- Proper height, font weight, and spacing matching Google's brand guidelines
- Hover/focus states; disabled state during loading
- Built as a small reusable `GoogleButton` component in `src/components/google-button.tsx` so login (and later register) can both use it

## 3. Show / hide password toggle

Create `src/components/password-input.tsx` — a wrapper around the existing shadcn `Input` that:
- Adds an `Eye` / `EyeOff` (lucide-react) toggle button on the right
- Toggles `type` between `password` and `text`
- Keeps right padding so the icon never overlaps typed text
- Forwards refs and all standard input props (so it's a drop-in replacement)
- Adds `aria-label` for accessibility ("Show password" / "Hide password")

Use it on both `login.tsx` and `register.tsx`.

## 4. Verify the email is real (email verification flow)

Firebase doesn't pre-check that an inbox exists, but it can require the user to **prove** they own the address by clicking a link sent to it. I'll wire the standard flow:

**On signup (`auth-context.tsx`)**
- After `createUserWithEmailAndPassword`, immediately call `sendEmailVerification(user, { url: window.location.origin + '/login' })`
- Continue creating the Firestore profile (so we still have the user record)

**Add Google sign-in to register page too** (matches login)

**New gate: `src/components/email-verification-gate.tsx`**
- Wraps the authenticated app shell
- If `auth.currentUser && !currentUser.emailVerified && provider === 'password'`, render a full-screen card:
  - "Check your inbox — we sent a verification link to **{email}**"
  - **Resend email** button (calls `sendEmailVerification` again, with a 60-second cooldown to avoid spam / Firebase rate limits)
  - **I've verified — refresh** button (calls `currentUser.reload()` then re-checks `emailVerified`)
  - **Sign out** button
- Google sign-ins are auto-verified by Google, so they bypass this gate
- Mount it inside `src/routes/app.tsx`, `admin.tsx`, and `super.tsx` (or once at the auth-guard layer) so no role-based area is reachable until verified

**Translation strings** added to `en.ts`, `am.ts`, `om.ts` for: verifyTitle, verifySubtitle, resend, resendCooldown, refresh, verifySent, verifyFailed.

**Toast feedback** on signup: "Account created — check your email to verify."

## 5. Small related polish
- Reset the `busy` state correctly when signup throws (already handled, but I'll double-check the path now that signup awaits two async steps + verification email)
- Trim email/whitespace on submit to avoid Firebase `invalid-email` confusion
- Friendly error mapping: convert Firebase error codes (`auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`, `auth/network-request-failed`) into translated user-facing messages instead of raw `FirebaseError: Firebase: Error (auth/...)`

## Files to be created / edited
- **edit** `src/lib/auth-context.tsx` — send verification email, rollback on Firestore failure, friendly error mapping
- **new** `src/components/google-button.tsx`
- **new** `src/components/password-input.tsx`
- **new** `src/components/email-verification-gate.tsx`
- **edit** `src/routes/login.tsx` — use `GoogleButton` + `PasswordInput`
- **edit** `src/routes/register.tsx` — use `GoogleButton` + `PasswordInput` + show verification toast
- **edit** `src/routes/app.tsx`, `src/routes/admin.tsx`, `src/routes/super.tsx` — wrap in `EmailVerificationGate`
- **edit** `src/i18n/locales/en.ts`, `am.ts`, `om.ts` — verification + error strings
- **YOU**: paste the Firestore rules above into the Firebase Console (this is the only thing I cannot do for you)

After you publish the rules, signup will write to Firestore correctly, the user will receive a verification email, and the rest of the app will load normally.
