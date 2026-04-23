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

export const Route = createFileRoute("/super/admins")({
  component: SuperAdmins,
});

function SuperAdmins() {
  const { t } = useTranslation();
  const { users, loading } = useAllUsers();
  const admins = users.filter((u) => u.role === "admin");
  const students = users.filter((u) => u.role === "student");
  const [reassign, setReassign] = useState<UserDoc | null>(null);
  const [target, setTarget] = useState<string>("");

  const setRole = async (u: UserDoc, role: Role) => {
    try {
      await updateDoc(doc(db, "users", u.id), { role });
      toast.success(t("common.success"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const doReassign = async () => {
    if (!reassign || !target) return;
    try {
      // reassign all students from `reassign` admin to `target` admin
      const batch = writeBatch(db);
      students
        .filter((s) => s.assignedAdminId === reassign.id)
        .forEach((s) => batch.update(doc(db, "users", s.id), { assignedAdminId: target }));
      await batch.commit();
      toast.success(t("common.success"));
      setReassign(null);
      setTarget("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("superAdmin.adminManagement")}</h1>

      <section className="space-y-3">
        <h2 className="font-semibold">{t("nav.admins")} ({admins.length})</h2>
        {loading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {admins.map((u) => {
              const count = students.filter((s) => s.assignedAdminId === u.id).length;
              return (
                <Card key={u.id} className="shadow-soft">
                  <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">{count} {t("nav.users")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setReassign(u)}>{t("superAdmin.reassign")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRole(u, "student")}>{t("superAdmin.removeAdmin")}</Button>
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
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.fullName}</p>
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
                          <SelectTrigger className="w-44"><SelectValue placeholder={assigned?.fullName ?? "—"} /></SelectTrigger>
                          <SelectContent>
                            {admins.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => setRole(u, "admin")}>{t("superAdmin.promoteToAdmin")}</Button>
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
          <DialogHeader><DialogTitle>{t("superAdmin.reassign")}</DialogTitle></DialogHeader>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger><SelectValue placeholder="Choose admin" /></SelectTrigger>
            <SelectContent>
              {admins.filter((a) => a.id !== reassign?.id).map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReassign(null)}>{t("common.cancel")}</Button>
            <Button onClick={doReassign} disabled={!target}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
