import {
  createContext,
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
import type { Gender, Role, UserDoc } from "@/lib/types";

interface SignUpData {
  fullName: string;
  phone: string;
  gender: Gender;
  email: string;
  password: string;
}

interface AuthCtx {
  user: FirebaseUser | null;
  profile: UserDoc | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signUp: (d: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

function friendlyAuthError(err: unknown): Error {
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
    "auth/too-many-requests": "Too many attempts. Please try again later.",
  };
  return new Error(map[code] ?? e?.message ?? "Something went wrong");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
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
          // bootstrap minimal profile if missing (e.g. Google sign-in first time)
          const newDoc: Omit<UserDoc, "createdAt"> & { createdAt: unknown } = {
            id: user.uid,
            fullName: user.displayName ?? user.email?.split("@")[0] ?? "User",
            email: user.email ?? "",
            phone: "",
            gender: "male",
            role: "student",
            assignedAdminId: null,
            language: "en",
            theme: "system",
            isActive: true,
            photoURL: user.photoURL ?? null,
            notificationsEnabled: true,
            createdAt: serverTimestamp(),
          };
          try {
            await setDoc(ref, newDoc);
          } catch {
            // surface via loading=false; UI will handle
          }
        } else {
          setProfile({ id: snap.id, ...(snap.data() as Omit<UserDoc, "id">) });
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      profile,
      role: profile?.role ?? null,
      loading,
      signIn: async (email, password) => {
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
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
      signUp: async (d) => {
        let cred;
        try {
          cred = await createUserWithEmailAndPassword(auth, d.email.trim(), d.password);
        } catch (err) {
          throw friendlyAuthError(err);
        }
        const ref = doc(db, "users", cred.user.uid);
        try {
          const exists = await getDoc(ref);
          if (!exists.exists()) {
            await setDoc(ref, {
              id: cred.user.uid,
              fullName: d.fullName.trim(),
              email: d.email.trim(),
              phone: d.phone.trim(),
              gender: d.gender,
              role: "student" as Role,
              assignedAdminId: null,
              language: "en",
              theme: "system",
              isActive: true,
              photoURL: null,
              notificationsEnabled: true,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          // Roll back the auth user so no orphan account is left behind
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
        // Send verification email (non-blocking — failure shouldn't break signup)
        try {
          await sendEmailVerification(cred.user, {
            url: window.location.origin + "/login",
          });
        } catch {
          // ignore
        }
      },
      signOut: async () => {
        await fbSignOut(auth);
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
