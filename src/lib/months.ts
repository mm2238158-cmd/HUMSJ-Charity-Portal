import { collection, doc, getDocs, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type DeadlineDay = 28 | 29 | 30;

export function currentMonthId(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function lastDayOfMonth(year: number, monthZeroBased: number): number {
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

export function clampedDeadlineDate(date: Date, day: DeadlineDay): Date {
  const last = lastDayOfMonth(date.getFullYear(), date.getMonth());
  const target = Math.min(day, last);
  return new Date(date.getFullYear(), date.getMonth(), target, 23, 59, 59);
}

export function formatMonthName(d: Date, locale = "en-US"): string {
  return d.toLocaleString(locale, { month: "long", year: "numeric" });
}

/**
 * Ensures the current calendar month exists and is the active one.
 * Safe to call from multiple tabs — uses a Firestore transaction.
 * Requires super-admin Firestore rules to write months.
 */
export async function ensureCurrentMonth(deadlineDay: DeadlineDay = 28, locale = "en-US"): Promise<void> {
  const now = new Date();
  const id = currentMonthId(now);
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const due = clampedDeadlineDate(now, deadlineDay);
  const name = formatMonthName(start, locale);

  // First read all months outside the transaction to avoid scanning every time
  const allMonthsSnap = await getDocs(collection(db, "months"));
  const exists = allMonthsSnap.docs.some((d) => d.id === id);
  const activeOthers = allMonthsSnap.docs.filter((d) => d.id !== id && d.data().isActive === true);

  if (exists && activeOthers.length === 0) return; // already correct

  await runTransaction(db, async (tx) => {
    const ref = doc(db, "months", id);
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, {
        name,
        startDate: Timestamp.fromDate(start),
        dueDate: Timestamp.fromDate(due),
        isActive: true,
      });
    } else if (!snap.data().isActive) {
      tx.update(ref, { isActive: true });
    }
    for (const other of activeOthers) {
      tx.update(doc(db, "months", other.id), { isActive: false });
    }
  });
}

export function isPastDeadline(dueDateMs: number | undefined | null, now: Date = new Date()): boolean {
  if (!dueDateMs) return false;
  return now.getTime() > dueDateMs;
}

/**
 * Calls ensureCurrentMonth and silently swallows permission-denied errors,
 * so it can be invoked from any signed-in client (students/admins) without
 * crashing when Firestore rules forbid writes.
 */
export async function safeEnsureCurrentMonth(
  deadlineDay: DeadlineDay = 28,
  locale = "en-US",
): Promise<void> {
  try {
    await ensureCurrentMonth(deadlineDay, locale);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";
    if (code === "permission-denied" || code === "permission_denied") return;
    // Other errors (network, etc.) are non-fatal here too — log and move on.
    console.warn("safeEnsureCurrentMonth:", err);
  }
}

/**
 * Splits a desc-sorted month list into the latest 4 ("recent") and the rest ("history").
 */
export function splitMonths<T>(months: T[]): { recent: T[]; history: T[] } {
  return { recent: months.slice(0, 4), history: months.slice(4) };
}
