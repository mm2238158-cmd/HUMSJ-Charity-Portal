# Gender-matched assignment + Super-admin contribution control

## 1. How assignment works **today** (audit)

I traced every place `assignedAdminId` is set or read. There is currently **no automatic assignment** — and **gender is completely ignored**:


| Where                                          | What happens                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `auth-context.tsx` signup (line 217)           | New student saved with `assignedAdminId: null`                                         |
| `auth-context.tsx` Google bootstrap (line 115) | Same — `null`                                                                          |
| `super.admins.tsx` (line 114)                  | Super-admin must manually pick an admin from a `<Select>` for each student, one by one |
| `super.admins.tsx` reassign (line 55)          | Bulk reassigns *all* of one admin's students to another admin — still ignores gender   |
| `seed.ts` (line 74)                            | Demo data uses `adminIds[i % adminIds.length]` — round-robin, gender-blind             |


**Consequence:** every newly registered student has `assignedAdminId: null`, so they cannot submit a payment (the `app.pay.tsx` flow writes `adminId: profile.assignedAdminId ?? null`, and the admin's "Pending approvals" list filters by `where("adminId", "==", user.uid)` — meaning **no admin ever sees that student's submission**). Your stated rule "male admins for male students, female admins for female students" is not enforced anywhere.

## 2. Fix — gender-matched auto-assignment

### A. New helper `src/lib/assignment.ts`

- `pickAdminForGender(gender: Gender, admins: UserDoc[], students: UserDoc[]): string | null`
- Filters `admins` to `role === "admin" && isActive && gender === student.gender`
- Among matching admins, picks the one with the **fewest currently assigned students of that gender** (load balancing). Ties broken by `createdAt` ascending for stability.
- Returns `null` if no same-gender admin exists (caller surfaces a friendly toast instead of silently leaving `null`).

### B. Auto-assign on signup (`auth-context.tsx`)

In `signUp` (and the Google profile bootstrap), after the user picks gender:

1. `getDocs` of `users` where `role == "admin"` and `gender == student.gender` and `isActive == true`
2. For each candidate, count `users` where `assignedAdminId == candidate.id` (single batched read, or computed from a single `getDocs` of all students of that gender)
3. Set `assignedAdminId` on the new user doc to the least-loaded match
4. If no same-gender admin exists yet, save `assignedAdminId: null` and show a toast "Account created — waiting for a {gender} admin to be assigned by super-admin"

### C. Re-assign on gender admin promotion / demotion / deletion (`super.admins.tsx`)

- **Promote student → admin**: when a student is promoted, automatically rebalance — any same-gender students currently sitting on `assignedAdminId: null` get picked up by the new admin.
- **Remove admin (demote to student)**: their existing students are auto-redistributed to other same-gender admins using the same picker (the current "Reassign" dialog becomes optional manual override). If no same-gender admin remains, assign `null` and notify super-admin.
- The existing manual `<Select>` in the students table is kept as an **override**, but it now filters its options to *same-gender admins only* (cross-gender selection blocked + tooltip).

### D. Backfill button in super settings

A one-click **"Rebalance assignments"** button in `/super/settings` that runs the picker over every student with `assignedAdminId == null` *or* where their current admin's gender no longer matches. Useful right now to fix every existing user who was registered before this rule existed.

### E. Type & UI

- `register.tsx` already collects gender — no schema change needed.
- Super-admin "Admins" page shows each admin's gender badge so it's obvious who handles whom.
- `super.users.tsx` table gets a "⚠ Gender mismatch" row warning where applicable.

## 3. Super-admin contribution oversight

Today super-admin can see **totals** on `/super` but cannot:

- View the full list of contributions across all admins
- Approve or reject anything (only the assigned admin can)
- Override a wrong rejection / approval
- Reassign a stuck contribution to a different admin

### Changes

**A. New route `src/routes/super.contributions.tsx**` (`/super/contributions`)

- Lists *all* contributions across all admins, with filters: month, status (pending/approved/rejected/late), admin, student name, gender
- Each row shows: student, gender, admin, month, amount, submitted date, status, screenshot preview
- **Approve** and **Reject** buttons (with reason dialog) — same logic as admin approval, but works on any contribution regardless of `adminId`
- **Reassign to different admin** action (drops down list of same-gender admins) — useful when the original admin is unavailable
- Bulk select + bulk approve for trusted batches

**B. Add nav entry**
`useNavItems()` in `app-nav.tsx` gets a `super-admin` entry pointing to `/super/contributions` with a `CheckCircle2` icon.

**C. Existing super dashboard (`/super`)**
Add a 4th tile: **"Pending across all admins"** with a count + click-through to the new contributions page filtered to status=pending.

**D. Notifications**
When super-admin acts on a contribution, the same notification document is written to the student (and a separate one to the assigned admin so they're not surprised: "Super-admin {name} approved {student}'s {month} contribution").

## 4. Firestore rules update (REQUIRES YOUR ACTION)

Current published rules only let students read/write their own contributions. Admins and super-admins can't update them, which means **the existing approve/reject buttons on `/admin/approvals` are also silently failing for live signups** unless rules are extended. New rules to publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function userDoc(uid) { return get(/databases/$(database)/documents/users/$(uid)).data; }
    function isAdmin() { return isSignedIn() && userDoc(request.auth.uid).role == 'admin'; }
    function isSuperAdmin() { return isSignedIn() && userDoc(request.auth.uid).role == 'super-admin'; }
    function isStaff() { return isAdmin() || isSuperAdmin(); }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == userId;
      // Self updates OR super-admin updates (role / assignedAdminId changes)
      allow update: if isSignedIn() && (request.auth.uid == userId || isSuperAdmin());
      allow delete: if false;
    }

    match /months/{monthId} {
      allow read: if isSignedIn();
      // Super-admin manages months; auto-rollover also runs as super-admin in client
      allow write: if isSuperAdmin();
    }

    match /settings/{docId} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin();
    }

    match /contributions/{id} {
      // Owner reads own; admins read theirs; super-admin reads all
      allow read: if isSignedIn() && (
        resource.data.userId == request.auth.uid ||
        (isAdmin() && resource.data.adminId == request.auth.uid) ||
        isSuperAdmin()
      );
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      // Owner can edit only their own pending; admin can approve/reject theirs; super-admin anything
      allow update: if isSignedIn() && (
        (resource.data.userId == request.auth.uid && resource.data.status == 'pending') ||
        (isAdmin() && resource.data.adminId == request.auth.uid) ||
        isSuperAdmin()
      );
      allow delete: if isSuperAdmin();
    }

    match /notifications/{id} {
      allow read, update: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn();
      allow delete: if isSuperAdmin();
    }
  }
}
```

Storage rules stay as the previous round.

## 5. Files to be created / edited

**Create**

- `src/lib/assignment.ts` — same-gender admin picker
- `src/routes/super.contributions.tsx` — global oversight page

**Edit**

- `src/lib/auth-context.tsx` — call picker on signup + Google bootstrap
- `src/routes/super.admins.tsx` — auto-redistribute on promote/demote, gender-filtered manual override, gender badges
- `src/routes/super.index.tsx` — add "Pending across all admins" tile + link
- `src/routes/super.settings.tsx` — add "Rebalance assignments" button
- `src/routes/super.users.tsx` — gender mismatch warning
- `src/components/app-nav.tsx` — add super-admin contributions nav item
- `src/i18n/locales/{en,am,om}.ts` — strings: `noSameGenderAdmin`, `genderMismatch`, `rebalance`, `rebalanced`, `superContributions`, `reassignAdmin`, `crossGenderBlocked`

**You (Firebase Console)**

- Publish the updated Firestore rules above

## 6. Open questions before I implement

1. **What should happen to a student who registers and there is no same-gender admin yet?** Recommended: save `assignedAdminId: null`, show the student a "pending admin assignment" notice on `/app`, and surface them to super-admin in a "Needs assignment" list. Confirm or pick a different fallback.
2. **Cross-gender override for super-admin?** Currently I'll block the manual cross-gender select. If you ever want to allow it (e.g., temporary coverage), say so and I'll add a confirmation dialog instead of an outright block.
3. **Super-admin acting as approver — should the contribution still show `approvedBy: superAdminUid` or should it also blank `adminId` to reassign accountability?** Recommended: keep original `adminId`, set `approvedBy` to super-admin's uid so the audit trail is honest.  
  
ANSWERS  
1. DO THE RECOMMENDED ONE!  
2. **Cross-gender override for super-admin IS IMPORTANT**  
3.  DO THE RECOMMENDED ONE!