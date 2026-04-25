
# Critical Auth Fixes — Domain Allowlist, Email Verification, Password Confirm

## Root cause analysis (from your network logs)

The Firebase API is rejecting two operations with `auth/unauthorized-domain` / `UNAUTHORIZED_DOMAIN`:
1. `sendOobCode` (verification email) → 400
2. Google sign-in popup → same root cause

**Why:** Your app is loaded on `5b69f9a2-d072-4e94-ad44-782da6a23233.lovableproject.com` (and the preview also loads on `id-preview--…lovable.app`), but Firebase only trusts a fixed allowlist set in **Authentication → Settings → Authorized domains**. By default that list contains only `localhost` and `humsj-charity-portal.firebaseapp.com`. Until those Lovable domains are added, **no** verification email or OAuth popup will ever succeed — this is a Firebase project setting, not something code can override.

The Firestore write itself succeeded (your published rules are working — the user doc `auTROYQPBDS4QMzIJTkR2srIWyx2` was created). So issue #3 ("user appears in both") is actually expected and correct.

---

## 1. REQUIRES YOUR ACTION — Add authorized domains in Firebase

This **cannot** be fixed from code. Open:
👉 https://console.firebase.google.com/project/humsj-charity-portal/authentication/settings

Under **Authorized domains**, click **Add domain** and add each of these (one at a time):
- `lovableproject.com`
- `lovable.app`
- `lovable.dev`

(Firebase matches subdomains automatically, so `lovableproject.com` covers `5b69f9a2-….lovableproject.com`, and `lovable.app` covers all `id-preview--….lovable.app` URLs and your future published `*.lovable.app` URL. Add your custom production domain later when you have one.)

Also, while you're in the console:
- **Authentication → Sign-in method**: confirm **Google** provider is **enabled** (toggle on, save). If it isn't, the Google button will fail with `auth/operation-not-allowed` even after the domain is allowlisted.

After clicking Save, give it ~30 seconds, then retry — both Google sign-in and "Resend email" will work immediately. No redeploy needed.

---

## 2. Code-side hardening I'll do in the same loop

### A. Password confirmation field on register
- Add a second `PasswordInput` ("Confirm password") to `src/routes/register.tsx`
- Validate match before submit; show inline error + toast if mismatch
- Add `passwordMismatch` / `confirmPassword` strings to `en.ts`, `am.ts`, `om.ts`

### B. Friendlier error mapping for the new domain errors
In `src/lib/auth-context.tsx` extend `friendlyAuthError` to translate:
- `auth/unauthorized-domain` → "This domain isn't authorized in Firebase. Add it under Authentication → Settings → Authorized domains."
- `auth/unauthorized-continue-uri` → same explanation, mentions verification link target
- `auth/operation-not-allowed` → "Google sign-in is disabled in your Firebase project. Enable it in Authentication → Sign-in method."
- `auth/popup-blocked` → "Browser blocked the sign-in popup. Allow popups and try again."

### C. Make signup honest about verification email failures
Right now we tell the user "Account created — check your email" even when `sendEmailVerification` silently fails (the call is wrapped in `try { … } catch {}` that swallows errors). I'll change `signUp` in `auth-context.tsx` to **return** `{ verificationSent: boolean, verificationError?: string }` and have `register.tsx` show:
- ✅ "Account created — check your inbox to verify" if it succeeded
- ⚠️ "Account created, but we couldn't send the verification email: {reason}. Sign in and use 'Resend' once the domain is authorized." if it failed
This way you'll never again see a misleading success toast when the email never went out.

### D. EmailVerificationGate — clearer copy + show resend error
Already exists but the resend toast just shows `(err as Error).message`. I'll route the failure through the same `friendlyAuthError` mapper so it produces the actionable message above instead of `Firebase: Domain not allowlisted by project (auth/unauthorized-continue-uri)`.

### E. Use a stable verification redirect
The `continueUrl` we pass to `sendEmailVerification` is `window.location.origin + "/login"`. That's correct, but I'll also add `handleCodeInApp: false` explicitly so Firebase uses its hosted verification handler at `humsj-charity-portal.firebaseapp.com/__/auth/action` — which is **always** authorized. That makes the flow more robust if a preview URL changes.

### F. Other critical logic issues found while auditing

1. **Profile bootstrap race** (`auth-context.tsx`): the `onSnapshot` listener tries to write a default profile (`setDoc`) for any signed-in user whose doc is missing — but if Firestore rules deny writes, we just swallow the error and `setLoading(false)`, leaving the user stuck on a blank screen forever. I'll add a visible toast + a "Retry / Sign out" fallback UI when bootstrap fails.

2. **Stale verification state after click** (`email-verification-gate.tsx`): `force((n) => n + 1)` rerenders the gate but it then re-evaluates `user.emailVerified` from the **same** stale `user` object cached by the auth context — `auth.currentUser.reload()` doesn't push a new `onAuthStateChanged` event for a verification flag flip. Fix: after `reload()`, explicitly call `setUser(auth.currentUser)` from the auth context (expose a `refreshUser()` helper) so the whole tree sees the new `emailVerified: true`.

3. **Trim email everywhere**: register and login already trim in `auth-context`, but I'll also `.trim().toLowerCase()` to avoid Firebase treating `Foo@x.com` and `foo@x.com` as different accounts.

4. **Disable submit while Google popup is open**: register currently sets a single `busy` for both flows, which is fine, but if the popup is closed by the user `busy` correctly resets — verified, no change needed.

5. **`super.tsx` bypassing the verification gate**: in the previous round we wrapped `app.tsx` and `admin.tsx` in `<EmailVerificationGate>` but `super.tsx` was edited too — I'll re-verify all three are wrapped consistently.

6. **`signIn` doesn't reload user**: if a user verified their email, then signs in fresh, `emailVerified` should already be true on the new token — verified, no change needed.

---

## 3. Files to be edited

- **edit** `src/lib/auth-context.tsx` — friendlier error mapping (incl. `unauthorized-domain`, `unauthorized-continue-uri`, `operation-not-allowed`, `popup-blocked`); `signUp` returns verification status; expose `refreshUser()`; explicit `handleCodeInApp: false`; surface profile-bootstrap failures
- **edit** `src/routes/register.tsx` — add Confirm Password field + match validation; show truthful toast based on `verificationSent`
- **edit** `src/components/email-verification-gate.tsx` — call `refreshUser()` after `reload()`; route resend errors through friendly mapper
- **verify** `src/routes/super.tsx` is wrapped in `EmailVerificationGate` (fix if missing)
- **edit** `src/i18n/locales/en.ts`, `am.ts`, `om.ts` — `confirmPassword`, `passwordMismatch`, `domainNotAllowed`, `googleDisabled`, `popupBlocked`, `verifySendFailed`, `profileLoadFailed`

---

## 4. What you must do for the errors to actually disappear

| Error you saw | Fix |
|---|---|
| `auth/unauthorized-domain` (Google button) | **You** add `lovableproject.com`, `lovable.app`, `lovable.dev` to Firebase **Authorized domains** |
| `Domain not allowlisted by project` (verification email) | Same as above — same setting |
| `auth/operation-not-allowed` (if it appears) | **You** enable Google in Firebase **Sign-in method** |
| Misleading "verification sent" toast | I'll fix in code |
| Missing confirm-password field | I'll fix in code |
| Stuck "verifying" state after clicking the email link | I'll fix in code |

After you add those three domains in the console, the very next signup will actually receive the email and the Google button will open the popup successfully — no rebuild required on your side.
