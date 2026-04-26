import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  deleteUser,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { pickAdminForGenderFromDb } from "@/lib/assignment";
import type { Gender, Role, UserDoc } from "@/lib/types";

interface SignUpData {
  fullName: string;
  phone: string;
  gender: Gender;
  email: string;
  password: string;
}

export interface SignUpResult {
  verificationSent: boolean;
  verificationError?: string;
}

interface AuthCtx {
  user: FirebaseUser | null;
  profile: UserDoc | null;
  role: Role | null;
  loading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signUp: (d: SignUpData) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function friendlyAuthError(err: unknown): Error {
  const e = err as { code?: string; message?: string };
  const code = e?.code ?? "";
  const map: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "Incorrect email or password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/popup-closed-by-user": "Sign-in cancelled.",
    "auth/popup-blocked": "Browser blocked the sign-in popup. Allow popups and try again.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/unauthorized-domain":
      "This domain isn't authorized in Firebase. Add it under Authentication → Settings → Authorized domains.",
    "auth/unauthorized-continue-uri":
      "Verification link domain isn't authorized in Firebase. Add this domain under Authentication → Settings → Authorized domains.",
    "auth/operation-not-allowed":
      "Google sign-in is disabled in your Firebase project. Enable it in Authentication → Sign-in method.",
  };
  return new Error(map[code] ?? e?.message ?? "Something went wrong");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          // Google sign-in bootstrap: assign default gender=male; super-admin can correct later.
          // Try same-gender admin pick.
          const defaultGender: Gender = "male";
          let assigned: string | null = null;
          try {
            assigned = await pickAdminForGenderFromDb(defaultGender);
          } catch {
            assigned = null;
          }
          const newDoc: Omit<UserDoc, "createdAt"> & { createdAt: unknown } = {
            id: user.uid,
            fullName: user.displayName ?? user.email?.split("@")[0] ?? "User",
            email: (user.email ?? "").toLowerCase(),
            phone: "",
            gender: defaultGender,
            role: "student",
            assignedAdminId: assigned,
            language: "en",
            theme: "system",
            isActive: true,
            photoURL: user.photoURL ?? null,
            notificationsEnabled: true,
            createdAt: serverTimestamp(),
          };
          try {
            await setDoc(ref, newDoc);
            setProfileError(null);
          } catch (err) {
            const e = err as { code?: string; message?: string };
            setProfileError(
              e?.code === "permission-denied"
                ? "Profile could not be loaded: database permissions are not configured."
                : (e?.message ?? "Failed to load profile"),
            );
          }
        } else {
          setProfile({ id: snap.id, ...(snap.data() as Omit<UserDoc, "id">) });
          setProfileError(null);
        }
        setLoading(false);
      },
      (err) => {
        setProfileError(err.message ?? "Failed to load profile");
        setLoading(false);
      },
    );
    return unsub;
  }, [user]);

  // Auto-create the current calendar month when a super-admin signs in.
  // Safe no-op if the month already exists & is active.
  useEffect(() => {
    if (!profile || profile.role !== "super-admin") return;
    let cancelled = false;
    (async () => {
      try {
        const { ensureCurrentMonth } = await import("@/lib/months");
        const { getDoc, doc: docRef } = await import("firebase/firestore");
        const settingsSnap = await getDoc(docRef(db, "settings", "global"));
        const day = (settingsSnap.exists() ? (settingsSnap.data().collectionDeadlineDay as 28 | 29 | 30) : 28) ?? 28;
        if (cancelled) return;
        await ensureCurrentMonth(day, profile.language === "am" ? "am-ET" : profile.language === "om" ? "om-ET" : "en-US");
      } catch {
        // best effort — surfaced via UI elsewhere
      }
    })();
    return () => { cancelled = true; };
  }, [profile]);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    // Force a new reference so React picks up the changed emailVerified flag
    setUser({ ...auth.currentUser } as FirebaseUser);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      profile,
      role: profile?.role ?? null,
      loading,
      profileError,
      refreshUser,
      signIn: async (email, password) => {
        try {
          await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        } catch (err) {
          throw friendlyAuthError(err);
        }
      },
      signInGoogle: async () => {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
        } catch (err) {
          throw friendlyAuthError(err);
        }
      },
      signUp: async (d): Promise<SignUpResult> => {
        const cleanEmail = d.email.trim().toLowerCase();
        let cred;
        try {
          cred = await createUserWithEmailAndPassword(auth, cleanEmail, d.password);
        } catch (err) {
          throw friendlyAuthError(err);
        }
        const ref = doc(db, "users", cred.user.uid);
        try {
          // Auto-assign a same-gender admin (load-balanced). Null if none exist yet.
          let assigned: string | null = null;
          try {
            assigned = await pickAdminForGenderFromDb(d.gender);
          } catch {
            assigned = null;
          }
          const exists = await getDoc(ref);
          if (!exists.exists()) {
            await setDoc(ref, {
              id: cred.user.uid,
              fullName: d.fullName.trim(),
              email: cleanEmail,
              phone: d.phone.trim(),
              gender: d.gender,
              role: "student" as Role,
              assignedAdminId: assigned,
              language: "en",
              theme: "system",
              isActive: true,
              photoURL: null,
              notificationsEnabled: true,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          try {
            await deleteUser(cred.user);
          } catch {
            // best effort
          }
          const e = err as { code?: string; message?: string };
          if (e?.code === "permission-denied") {
            throw new Error(
              "Account could not be created: database permissions are not configured. Please contact the administrator.",
            );
          }
          throw new Error(e?.message ?? "Failed to create account");
        }
        // Send verification email and report whether it actually worked
        try {
          await sendEmailVerification(cred.user, {
            url: window.location.origin + "/login",
            handleCodeInApp: false,
          });
          return { verificationSent: true };
        } catch (err) {
          return {
            verificationSent: false,
            verificationError: friendlyAuthError(err).message,
          };
        }
      },
      signOut: async () => {
        await fbSignOut(auth);
      },
    }),
    [user, profile, loading, profileError, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
