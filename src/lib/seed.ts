import { collection, doc, getDocs, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

const FIRST_NAMES = ["Ahmed", "Fatima", "Mohammed", "Aisha", "Omar", "Khadija", "Yusuf", "Zainab", "Ali", "Maryam", "Hassan", "Hawa", "Ibrahim", "Amina", "Mustafa"];
const LAST_NAMES = ["Abdulahi", "Hassen", "Yimer", "Seid", "Ahmed", "Beshir", "Jemal", "Adem", "Nasir", "Hussein"];

export async function seedDemoData() {
  // Skip if already seeded
  const existing = await getDocs(collection(db, "months"));
  if (existing.size > 0) {
    console.log("Already seeded");
  }

  const batch = writeBatch(db);

  // Months: 6 months ending current
  const now = new Date();
  const months: { id: string; name: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const due = new Date(d.getFullYear(), d.getMonth(), 25);
    const name = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    months.push({ id, name });
    batch.set(doc(db, "months", id), {
      name,
      startDate: Timestamp.fromDate(d),
      dueDate: Timestamp.fromDate(due),
      isActive: i === 0,
    });
  }

  // Settings
  batch.set(doc(db, "settings", "global"), {
    contributionAmount: 50,
    reminderDaysBefore: 3,
    allowLatePayment: true,
  });

  // 4 admins
  const adminIds: string[] = [];
  for (let i = 0; i < 4; i++) {
    const id = `seed_admin_${i + 1}`;
    adminIds.push(id);
    batch.set(doc(db, "users", id), {
      fullName: `${FIRST_NAMES[i]} ${LAST_NAMES[i]}`,
      email: `admin${i + 1}@humsj.demo`,
      phone: `+25191100000${i + 1}`,
      gender: i % 2 === 0 ? "male" : "female",
      role: "admin",
      assignedAdminId: null,
      language: "en",
      theme: "system",
      isActive: true,
      photoURL: null,
      notificationsEnabled: true,
      createdAt: serverTimestamp(),
    });
  }

  // 50 students
  const studentIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const id = `seed_student_${i + 1}`;
    studentIds.push(id);
    const fn = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const ln = LAST_NAMES[i % LAST_NAMES.length]!;
    batch.set(doc(db, "users", id), {
      fullName: `${fn} ${ln}`,
      email: `student${i + 1}@humsj.demo`,
      phone: `+25192000${String(i).padStart(4, "0")}`,
      gender: i % 2 === 0 ? "male" : "female",
      role: "student",
      assignedAdminId: adminIds[i % adminIds.length],
      language: "en",
      theme: "system",
      isActive: true,
      photoURL: null,
      notificationsEnabled: true,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();

  // Contributions in chunks
  const STATUSES: Array<"approved" | "pending" | "rejected"> = ["approved", "approved", "approved", "pending", "rejected"];
  let chunk = writeBatch(db);
  let count = 0;
  for (const sid of studentIds) {
    for (const m of months) {
      // ~70% submitted
      if (Math.random() > 0.7) continue;
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)]!;
      const cid = `${sid}_${m.id}`;
      const adminId = adminIds[studentIds.indexOf(sid) % adminIds.length];
      chunk.set(doc(db, "contributions", cid), {
        userId: sid,
        adminId,
        monthId: m.id,
        amount: 50,
        screenshotUrl: "https://placehold.co/600x400?text=Payment+Proof",
        status,
        submittedAt: serverTimestamp(),
        approvedAt: status !== "pending" ? serverTimestamp() : null,
        approvedBy: status !== "pending" ? adminId : null,
        rejectionReason: status === "rejected" ? "Unclear screenshot" : null,
      });
      count++;
      if (count % 400 === 0) {
        await chunk.commit();
        chunk = writeBatch(db);
      }
    }
  }
  await chunk.commit();
}
