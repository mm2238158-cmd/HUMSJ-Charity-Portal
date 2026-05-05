import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import type {
  ContributionDoc,
  MonthDoc,
  NotificationDoc,
  SettingsDoc,
  UserDoc,
} from "@/lib/types";

function mapDoc<T>(d: QueryDocumentSnapshot<DocumentData>): T {
  return { id: d.id, ...(d.data() as Omit<T, "id">) } as T;
}

export function useActiveMonth() {
  const [month, setMonth] = useState<MonthDoc | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, "months"), where("isActive", "==", true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const first = snap.docs[0];
        setMonth(first ? mapDoc<MonthDoc>(first) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);
  return { month, loading };
}

export function useMonths() {
  const [months, setMonths] = useState<MonthDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, "months"), orderBy("startDate", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMonths(snap.docs.map((d) => mapDoc<MonthDoc>(d)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);
  return { months, loading };
}

/**
 * Convenience hook: returns months split into latest 4 (recent) and the rest (history),
 * plus the full sorted list. Sorted descending by startDate.
 */
export function useRecentAndHistoryMonths() {
  const { months, loading } = useMonths();
  const recent = months.slice(0, 4);
  const history = months.slice(4);
  return { all: months, recent, history, loading };
}

export function useUserContributions(userId: string | undefined) {
  const [items, setItems] = useState<ContributionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "contributions"), where("userId", "==", userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => mapDoc<ContributionDoc>(d));
        arr.sort((a, b) => {
          const ta = a.submittedAt?.toMillis?.() ?? 0;
          const tb = b.submittedAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setItems(arr);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [userId]);
  return { items, loading };
}

export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => mapDoc<NotificationDoc>(d));
        arr.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setItems(arr);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [userId]);
  return { items, loading };
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const ref = doc(db, "settings", "global");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setSettings(snap.data() as SettingsDoc);
        else setSettings({ contributionAmount: 50, reminderDaysBefore: 3, allowLatePayment: true });
        setLoading(false);
      },
      () => {
        setSettings({ contributionAmount: 50, reminderDaysBefore: 3, allowLatePayment: true });
        setLoading(false);
      },
    );
    return unsub;
  }, []);
  return { settings, loading };
}

export function useAllUsers() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsers(snap.docs.map((d) => mapDoc<UserDoc>(d)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);
  return { users, loading };
}

export function useAdminAssignedUsers(adminId: string | undefined) {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!adminId) {
      setUsers([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "users"), where("assignedAdminId", "==", adminId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => mapDoc<UserDoc>(d)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [adminId]);
  return { users, loading };
}

export function useAdminPendingContributions(adminId: string | undefined) {
  const [items, setItems] = useState<ContributionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!adminId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "contributions"),
      where("adminId", "==", adminId),
      where("status", "==", "pending"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => mapDoc<ContributionDoc>(d)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [adminId]);
  return { items, loading };
}

export function useAllContributions() {
  const [items, setItems] = useState<ContributionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "contributions"),
      (snap) => {
        setItems(snap.docs.map((d) => mapDoc<ContributionDoc>(d)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);
  return { items, loading };
}

export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<UserDoc, "id">) };
}
