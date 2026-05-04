## Forgot Password — secure (anti-enumeration) behavior

Adopt industry-standard behavior: always show a generic success message, regardless of whether the email exists. Firebase only actually sends mail to real accounts, so legitimate users still get the link, and attackers can't probe which emails are registered.

### Changes

**`src/lib/forgot-password-schema.ts` (new)**
Tiny zod schema for strict format validation:
```ts
import { z } from "zod";
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
});
```

**`src/lib/auth-context.tsx`**
Update the `resetPassword` handler to swallow `auth/user-not-found` silently:
```ts
resetPassword: async (email: string) => {
  const clean = (email ?? "").trim().toLowerCase();
  if (!clean) throw new Error("Please enter your email address first.");
  try {
    await sendPasswordResetEmail(auth, clean, {
      url: window.location.origin + "/login",
      handleCodeInApp: false,
    });
  } catch (err) {
    const e = err as { code?: string };
    // Anti-enumeration: pretend success when the account doesn't exist.
    // Firebase only actually delivers mail to real accounts.
    if (e?.code === "auth/user-not-found") return;
    throw friendlyAuthError(err);  // still surface invalid-email, network, rate-limit
  }
},
```

**`src/components/forgot-password-dialog.tsx`**
- Validate input with `forgotPasswordSchema.safeParse(...)` before calling `resetPassword`. On format failure, show the zod error inline (not a toast).
- On success (including the silent "user not found" case), show the **generic** message: `t("auth.resetSentGeneric")` — *"If an account exists for that email, we've sent a reset link. Check your inbox (and spam folder)."*
- Keep loading state and Cancel button as is.

**i18n (en / am / om)** — add one key, replace one:
- replace `auth.resetSent` → `auth.resetSentGeneric`:
  - en: `"If an account exists for that email, we've sent a reset link. Check your inbox (and spam folder)."`
  - am: `"ለዚህ ኢሜይል መለያ ካለ፣ የማስተካከያ አገናኝ ልከንልዎታል። ኢሜይልዎን (እና አይፈለጌ መልዕክት ማውጫን) ይመልከቱ።"`
  - om: `"Yoo herregni imeelii kanaaf jiraate, liinkii haaromsaa siif ergineerra. Imeelii kee (akkasumas spam) ilaali."`

### Why this is the right call
- Prevents an attacker from enumerating registered female members (a real risk for a gender-segregated community app).
- Matches behavior of Google, GitHub, Stripe, etc. — users are accustomed to it.
- Honest typos in the email **format** still get a clear error (zod), so usability for the common mistake is preserved.

### Files
- create `src/lib/forgot-password-schema.ts`
- edit `src/lib/auth-context.tsx`
- edit `src/components/forgot-password-dialog.tsx`
- edit `src/i18n/locales/en.ts`, `am.ts`, `om.ts`