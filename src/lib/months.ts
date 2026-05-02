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

  try {
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
  } catch (err) {
    const code = (err as { code?: string })?.code;
    // Students (and any non-writer) will hit permission-denied — that's fine,
    // the cron job or an admin opening the app will perform the actual write.
    if (code === "permission-denied") return;
    throw err;
  }
}

export function isPastDeadline(dueDateMs: number | undefined | null, now: Date = new Date()): boolean {
  if (!dueDateMs) return false;
  return now.getTime() > dueDateMs;
}
