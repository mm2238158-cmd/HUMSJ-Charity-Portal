import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAllUsers } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Role, UserDoc } from "@/lib/types";
import { pickAdminForGender } from "@/lib/assignment";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/super/admins")({
  component: SuperAdmins,
});

function GenderBadge({ gender }: { gender: "male" | "female" }) {
  const cls =
    gender === "male"
      ? "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-300"
      : "bg-pink-500/15 text-pink-600 border-pink-500/30 dark:text-pink-300";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>
      {gender}
    </span>
  );
}

function SuperAdmins() {
  const { t } = useTranslation();
  const { users, loading } = useAllUsers();
  const admins = users.filter((u) => u.role === "admin");
  const students = users.filter((u) => u.role === "student");
  const [reassign, setReassign] = useState<UserDoc | null>(null);
  const [target, setTarget] = useState<string>("");

  const promoteToAdmin = async (u: UserDoc) => {
    try {
      await updateDoc(doc(db, "users", u.id), { role: "admin" });
      // Auto-pickup: any same-gender students sitting on null get assigned to this new admin.
      const orphans = students.filter(
        (s) => s.gender === u.gender && (!s.assignedAdminId || !admins.find((a) => a.id === s.assignedAdminId)),
      );
      if (orphans.length > 0) {
        const batch = writeBatch(db);
        orphans.forEach((s) => batch.update(doc(db, "users", s.id), { assignedAdminId: u.id }));
        await batch.commit();
        toast.success(`${t("common.success")} (+${orphans.length} ${t("nav.users")})`);
      } else {
        toast.success(t("common.success"));
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const demoteToStudent = async (u: UserDoc) => {
    try {
      // Redistribute their students to other same-gender admins first.
      const remainingAdmins = admins.filter((a) => a.id !== u.id);
      const myStudents = students.filter((s) => s.assignedAdminId === u.id);
      const batch = writeBatch(db);
      // working copy so picks balance
      const working = students.map((s) => ({ ...s }));
      let unassignable = 0;
      for (const s of myStudents) {
        const next = pickAdminForGender(s.gender, remainingAdmins, working);
        batch.update(doc(db, "users", s.id), { assignedAdminId: next });
        const idx = working.findIndex((w) => w.id === s.id);
        if (idx >= 0) working[idx].assignedAdminId = next;
        if (!next) unassignable++;
      }
      batch.update(doc(db, "users", u.id), { role: "student" });
      await batch.commit();
      if (unassignable > 0) {
        toast.warning(`${t("common.success")} — ${unassignable} ${t("superAdmin.unassignable")}`);
      } else {
        toast.success(t("common.success"));
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const setRole = async (u: UserDoc, role: Role) => {
    if (role === "admin") return promoteToAdmin(u);
    if (role === "student") return demoteToStudent(u);
  };

  const doReassign = async () => {
    if (!reassign || !target) return;
    const newAdmin = admins.find((a) => a.id === target);
    if (!newAdmin) return;
    try {
      const batch = writeBatch(db);
      students
        .filter((s) => s.assignedAdminId === reassign.id && s.gender === newAdmin.gender)
        .forEach((s) => batch.update(doc(db, "users", s.id), { assignedAdminId: target }));
      await batch.commit();
      toast.success(t("common.success"));
      setReassign(null);
      setTarget("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const sameGenderAdmins = (s: UserDoc) =>
    admins.filter((a) => a.gender === s.gender);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("superAdmin.adminManagement")}</h1>

      <section className="space-y-3">
        <h2 className="font-semibold">{t("nav.admins")} ({admins.length})</h2>
        <p className="text-xs text-muted-foreground">{t("superAdmin.genderRule")}</p>
        {loading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {admins.map((u) => {
              const count = students.filter((s) => s.assignedAdminId === u.id).length;
              const sameGender = students.filter(
                (s) => s.assignedAdminId === u.id && s.gender === u.gender,
              ).length;
              const mismatch = count - sameGender;
              return (
                <Card key={u.id} className="shadow-soft">
                  <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{u.fullName}</p>
                        <GenderBadge gender={u.gender} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {count} {t("nav.users")}
                        {mismatch > 0 && (
                          <span className="text-orange-500 ml-1">
                            · {mismatch} {t("superAdmin.mismatch")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setReassign(u)}>
                        {t("superAdmin.reassign")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRole(u, "student")}>
                        {t("superAdmin.removeAdmin")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">{t("common.student")} → {t("superAdmin.promoteToAdmin")}</h2>
        <Card className="shadow-soft">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {students.slice(0, 30).map((u) => {
                  const assigned = admins.find((a) => a.id === u.assignedAdminId);
                  const mismatch = assigned && assigned.gender !== u.gender;
                  const options = sameGenderAdmins(u);
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{u.fullName}</p>
                          <GenderBadge gender={u.gender} />
                          {mismatch && (
                            <span title={t("superAdmin.genderMismatch")}>
                              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs">
                        <Select
                          value={u.assignedAdminId ?? ""}
                          onValueChange={async (v) => {
                            await updateDoc(doc(db, "users", u.id), { assignedAdminId: v });
                            toast.success(t("common.success"));
                          }}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder={assigned?.fullName ?? "—"} />
                          </SelectTrigger>
                          <SelectContent>
                            {options.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                {t("superAdmin.noSameGenderAdmin")}
                              </div>
                            ) : (
                              options.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.fullName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => setRole(u, "admin")}>
                          {t("superAdmin.promoteToAdmin")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <Dialog open={!!reassign} onOpenChange={(o) => !o && setReassign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("superAdmin.reassign")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {t("superAdmin.reassignHint")}
          </p>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Choose admin" />
            </SelectTrigger>
            <SelectContent>
              {admins
                .filter((a) => a.id !== reassign?.id && a.gender === reassign?.gender)
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.fullName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReassign(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={doReassign} disabled={!target}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
