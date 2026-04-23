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
          await setDoc(ref, newDoc);
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
        await signInWithEmailAndPassword(auth, email, password);
      },
      signInGoogle: async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      },
      signUp: async (d) => {
        const cred = await createUserWithEmailAndPassword(auth, d.email, d.password);
        const ref = doc(db, "users", cred.user.uid);
        const exists = await getDoc(ref);
        if (!exists.exists()) {
          await setDoc(ref, {
            id: cred.user.uid,
            fullName: d.fullName,
            email: d.email,
            phone: d.phone,
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
