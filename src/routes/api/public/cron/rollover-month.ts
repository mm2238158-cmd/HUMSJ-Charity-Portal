import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/firebase-admin.server";

type DeadlineDay = 28 | 29 | 30;

function addisNow(): Date {
  // Africa/Addis_Ababa is UTC+3 with no DST.
  const utc = Date.now();
  return new Date(utc + 3 * 60 * 60 * 1000);
}

function monthIdOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastDay(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

function clampedDeadline(d: Date, day: DeadlineDay): Date {
  const last = lastDay(d.getUTCFullYear(), d.getUTCMonth());
  const target = Math.min(day, last);
  // Store as 23:59:59 local Addis time (= 20:59:59 UTC)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), target, 20, 59, 59));
}

function monthName(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

async function handle(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  const got = request.headers.get("x-cron-secret");
  if (!expected || !got || got !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  let admin;
  try {
    admin = getAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "admin init failed";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }

  const { db } = admin;

  // Read deadline from settings/global
  let deadlineDay: DeadlineDay = 28;
  try {
    const s = await db.doc("settings/global").get();
    const v = s.exists ? (s.data()?.collectionDeadlineDay as number | undefined) : undefined;
    if (v === 28 || v === 29 || v === 30) deadlineDay = v;
  } catch {
    // fall back to 28
  }

  const now = addisNow();
  const id = monthIdOf(now);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const due = clampedDeadline(now, deadlineDay);

  let created = false;
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`months/${id}`);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, {
        name: monthName(start),
        startDate: start,
        dueDate: due,
        isActive: true,
      });
      created = true;
    } else if (snap.data()?.isActive !== true) {
      tx.update(ref, { isActive: true });
    }
  });

  // Deactivate other active months (outside the txn — small collection)
  const others = await db.collection("months").where("isActive", "==", true).get();
  const batch = db.batch();
  let deactivated = 0;
  others.forEach((doc) => {
    if (doc.id !== id) {
      batch.update(doc.ref, { isActive: false });
      deactivated++;
    }
  });
  if (deactivated > 0) await batch.commit();

  return Response.json({ ok: true, monthId: id, created, deactivated, deadlineDay });
}

export const Route = createFileRoute("/api/public/cron/rollover-month")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      // Allow GET too so cron services that only support GET still work.
      GET: ({ request }) => handle(request),
    },
  },
});
