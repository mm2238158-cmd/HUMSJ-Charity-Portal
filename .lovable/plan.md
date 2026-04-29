## Goal

Make `/login` and `/register` feel polished, trustworthy, and on-brand — closer to what users expect from a modern fintech/charity SaaS — while keeping all existing logic (Firebase auth, gender, Ethiopian phone validation, email verification flow) untouched.

## What's wrong today

- Single narrow card centered on a flat soft gradient — looks like a bare template.
- No visual identity beyond the small logo; no brand panel, no imagery, no value props.
- Inputs are short (`h-9`), labels are plain, fields have no icons → form feels cramped.
- Register page squeezes phone + gender into a tight 2-col grid with a `Select` that looks misaligned next to the input.
- No password strength indicator, no show/hide affordance polish, no inline field validation.
- "or" divider, Google button, footer links all look default-shadcn — not branded.
- Mobile (647px viewport observed): card edges hug screen, no breathing room, headings small.

## Redesign — visual direction

Two-column **split layout** on `md+`, single-column stacked on mobile:

```text
+-------------------------------+----------------------------+
| BRAND PANEL (gradient)        | FORM PANEL (card)          |
|  - Logo + wordmark            |  - Heading + subcopy       |
|  - Headline ("Contribute...") |  - Inputs w/ leading icons |
|  - 3 value bullets w/ icons   |  - Password + strength bar |
|  - Subtle decorative blob     |  - Primary CTA             |
|  - Language switcher (small)  |  - Divider + Google btn    |
|                               |  - Footer link             |
+-------------------------------+----------------------------+
```

Mobile: brand panel collapses to a compact header strip (logo + tagline) above the form card. Form card gets `rounded-2xl`, `shadow-elegant`, more generous padding (`p-7 sm:p-8`).

Use existing tokens only — `--gradient-primary`, `--primary-glow`, `--shadow-elegant`, `--shadow-soft`. No new colors.

## Detailed changes

### 1. New shared component `src/components/auth-layout.tsx`
- Props: `title`, `subtitle`, `children`, `footer`.
- Renders the split layout (brand panel left, content right), handles responsive collapse.
- Brand panel content (driven by i18n):
  - Logo (h-12) + wordmark
  - H1: `auth.brandHeadline` ("Contribute. Connect. Care.")
  - Sub: `auth.brandSubline`
  - 3 bullets with lucide icons (`HeartHandshake`, `ShieldCheck`, `Users`) + i18n keys.
  - Decorative gradient blob using `--gradient-primary` + low opacity, positioned absolute.

### 2. New `src/components/icon-input.tsx`
- Wrapper around shadcn `Input` that accepts a `leadingIcon` (lucide) and renders it absolutely positioned, with `pl-10`. Forwards ref + all input props. Bumps height to `h-11` for both this and the existing `PasswordInput` for consistency on auth pages.

### 3. New `src/components/password-strength.tsx`
- Tiny 4-segment bar under the password field on register only.
- Score = length≥6, has lowercase+uppercase, has digit, has symbol.
- Colors: destructive → warning → primary-glow → success.
- Label text from i18n: weak / fair / good / strong.

### 4. Rewrite `src/routes/login.tsx`
- Use `<AuthLayout>`.
- Email field uses `IconInput` with `Mail` icon.
- Password uses updated `PasswordInput` (h-11) with `Lock` icon prefix.
- Add right-aligned `Forgot password?` link above password input (uses existing `auth.forgotPassword`; routes to `/login` with toast for now if route missing — we already have this string, just non-functional disabled link is fine; spec a real route in a follow-up).
- Primary button: `h-11`, full-width, gradient background via `bg-[image:var(--gradient-primary)] text-primary-foreground shadow-elegant hover:opacity-95`.
- Divider: thin border with centered `OR` chip.
- Google button: keep but unify to `h-11` and same radius.
- Footer: "Don't have an account? Sign up" centered, larger tap target.

### 5. Rewrite `src/routes/register.tsx`
- Use `<AuthLayout>` with register copy.
- Field order: Full name → Email → Phone + Gender (still 2-col but with proper alignment, both `h-11`, gender Select trigger restyled to match input height) → Password → Confirm password.
- Add inline helpers under fields:
  - Phone: muted text "Format: +2519XXXXXXXX" (already have `auth.phoneFormat`).
  - Password: `<PasswordStrength />` meter.
- Add a small consent line under the submit button: "By creating an account you agree to our Terms & Privacy" (i18n `auth.terms`). No link target needed yet — plain muted text.
- Same gradient primary CTA + Google + footer treatment as login.

### 6. i18n additions (en/am/om)
Add to `auth` namespace in all three locales:
- `brandHeadline`, `brandSubline`
- `valueProp1`, `valueProp2`, `valueProp3`
- `pwWeak`, `pwFair`, `pwGood`, `pwStrong`
- `terms`
- `emailPlaceholder` ("you@example.com"), `namePlaceholder` ("e.g. Abdi Mohammed")

### 7. Microinteractions
- Inputs: `transition-colors`, focus ring uses `--ring`; on hover border darkens slightly.
- Card: subtle `motion-safe:animate-in fade-in slide-in-from-bottom-2 duration-300` wrapper.
- Submit button shows spinner + label change ("Signing in…" / "Creating account…").

## Out of scope

- No changes to `auth-context.tsx`, Firebase rules, validation regex, or routing.
- No new password reset flow (only the visual link placeholder).
- No dark-mode-specific overhaul beyond what tokens already give us.

## Files

**Create**
- `src/components/auth-layout.tsx`
- `src/components/icon-input.tsx`
- `src/components/password-strength.tsx`

**Edit**
- `src/routes/login.tsx` — full rewrite of JSX, same logic.
- `src/routes/register.tsx` — full rewrite of JSX, same logic.
- `src/components/password-input.tsx` — bump default height to `h-11`, accept optional leading icon.
- `src/i18n/locales/en.ts`, `am.ts`, `om.ts` — add new keys.

## Acceptance check (after build)

- `/login` and `/register` show split layout on ≥768px, stacked on mobile.
- All inputs are `h-11`, gender select aligns with phone input.
- Password strength bar updates as user types on register.
- Submit, Google, and footer links work exactly as before.
- No TS or i18n key-missing warnings; responsive at 360 / 647 / 1024 / 1440.
