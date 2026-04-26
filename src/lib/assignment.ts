import { collection, getDocs, query, where, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Gender, UserDoc } from "@/lib/types";

/**
 * Pick the least-loaded active admin whose gender matches the student.
 * - admins: full list of users (will be filtered internally)
 * - students: full list of students (used to compute load)
 * Returns the admin UID, or null if no same-gender active admin exists.
 */
export function pickAdminForGender(
  gender: Gender,
  admins: UserDoc[],
  students: UserDoc[],
): string | null {
  const candidates = admins.filter(
    (a) => a.role === "admin" && a.isActive !== false && a.gender === gender,
  );
  if (candidates.length === 0) return null;

  const loadById = new Map<string, number>();
  for (const a of candidates) loadById.set(a.id, 0);
  for (const s of students) {
    if (s.role !== "student") continue;
    if (s.gender !== gender) continue;
    if (s.assignedAdminId && loadById.has(s.assignedAdminId)) {
      loadById.set(s.assignedAdminId, (loadById.get(s.assignedAdminId) ?? 0) + 1);
    }
  }

  // sort by load asc, then by createdAt asc for stability
  candidates.sort((a, b) => {
    const la = loadById.get(a.id) ?? 0;
    const lb = loadById.get(b.id) ?? 0;
    if (la !== lb) return la - lb;
    const ca = a.createdAt?.toMillis?.() ?? 0;
    const cb = b.createdAt?.toMillis?.() ?? 0;
    return ca - cb;
  });
  return candidates[0].id;
}

/**
 * Standalone version that fetches admins from Firestore (used at signup time
 * when we don't have the realtime user list in memory). Returns null if no
 * same-gender active admin exists.
 */
export async function pickAdminForGenderFromDb(gender: Gender): Promise<string | null> {
  const adminsSnap = await getDocs(
    query(collection(db, "users"), where("role", "==", "admin"), where("gender", "==", gender)),
  );
  const admins = adminsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }))
    .filter((a) => a.isActive !== false);
  if (admins.length === 0) return null;

  const studentsSnap = await getDocs(
    query(collection(db, "users"), where("role", "==", "student"), where("gender", "==", gender)),
  );
  const students = studentsSnap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }) as UserDoc,
  );
  return pickAdminForGender(gender, admins as UserDoc[], students);
}

/**
 * Rebalance every student whose assignedAdminId is null or whose current
 * admin's gender no longer matches. Returns counts of changes.
 */
export async function rebalanceAssignments(): Promise<{
  updated: number;
  unassignableMale: number;
  unassignableFemale: number;
}> {
  const usersSnap = await getDocs(collection(db, "users"));
  const users = usersSnap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }) as UserDoc,
  );
  const admins = users.filter((u) => u.role === "admin" && u.isActive !== false);
  const adminsById = new Map(admins.map((a) => [a.id, a]));
  const students = users.filter((u) => u.role === "student");

  const batch = writeBatch(db);
  let updated = 0;
  let unassignableMale = 0;
  let unassignableFemale = 0;

  // mutable load tracker for stable picks during the same pass
  const workingStudents: UserDoc[] = students.map((s) => ({ ...s }));

  for (const s of students) {
    const currentAdmin = s.assignedAdminId ? adminsById.get(s.assignedAdminId) : undefined;
    const needs =
      !s.assignedAdminId ||
      !currentAdmin ||
      currentAdmin.gender !== s.gender ||
      currentAdmin.isActive === false;
    if (!needs) continue;
    const target = pickAdminForGender(s.gender, admins, workingStudents);
    if (target === s.assignedAdminId) continue;
    if (!target) {
      if (s.gender === "male") unassignableMale++;
      else unassignableFemale++;
      // ensure null is set if dangling
      if (s.assignedAdminId) {
        batch.update(doc(db, "users", s.id), { assignedAdminId: null });
        updated++;
      }
      continue;
    }
    batch.update(doc(db, "users", s.id), { assignedAdminId: target });
    // reflect change in workingStudents so subsequent picks balance correctly
    const idx = workingStudents.findIndex((w) => w.id === s.id);
    if (idx >= 0) workingStudents[idx].assignedAdminId = target;
    updated++;
  }

  if (updated > 0) await batch.commit();
  return { updated, unassignableMale, unassignableFemale };
}
