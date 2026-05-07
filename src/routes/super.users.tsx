import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAllUsers } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { StudentAnalyticsDialog } from "@/components/student-analytics-dialog";
import { useTranslation } from "react-i18next";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Search, Eye } from "lucide-react";
import type { UserDoc } from "@/lib/types";

export const Route = createFileRoute("/super/users")({
  component: SuperUsers,
});

function SuperUsers() {
  const { t } = useTranslation();
  const { users, loading } = useAllUsers();
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<UserDoc | null>(null);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(q.toLowerCase()) ||
          u.email?.toLowerCase().includes(q.toLowerCase()),
      ),
    [users, q],
  );

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, "users", id), { isActive: !isActive });
      toast.success(t("common.success"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("superAdmin.userManagement")}</h1>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="pl-9" />
      </div>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((u) => {
              const assigned = users.find((a) => a.id === u.assignedAdminId);
              const mismatch = u.role === "student" && assigned && assigned.gender !== u.gender;
              return (
                <Card key={u.id} className="shadow-soft">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <StatusBadge status={u.isActive ? "active" : "inactive"} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{u.gender}</span>
                      <span className="rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 capitalize">{u.role}</span>
                      {mismatch && (
                        <span className="text-[10px] font-semibold text-orange-500">
                          ⚠ {t("superAdmin.mismatch")}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewing(u)}>
                        <Eye className="h-4 w-4 mr-1" /> {t("superAdmin.viewStudent")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(u.id, u.isActive)}
                      >
                        {u.isActive ? t("superAdmin.deactivate") : t("superAdmin.activate")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop: table */}
          <Card className="hidden md:block shadow-soft">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <tr><th className="px-4 py-3">{t("common.name")}</th><th className="px-4 py-3">{t("auth.email")}</th><th className="px-4 py-3">{t("auth.gender")}</th><th className="px-4 py-3">{t("common.role")}</th><th className="px-4 py-3">{t("common.status")}</th><th className="px-4 py-3">{t("common.actions")}</th></tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const assigned = users.find((a) => a.id === u.assignedAdminId);
                    const mismatch = u.role === "student" && assigned && assigned.gender !== u.gender;
                    return (
                      <tr key={u.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">
                          {u.fullName}
                          {mismatch && (
                            <span className="ml-2 text-[10px] font-semibold text-orange-500" title={t("superAdmin.genderMismatch")}>
                              ⚠ {t("superAdmin.mismatch")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3 text-xs capitalize">{u.gender}</td>
                        <td className="px-4 py-3 text-xs capitalize">{u.role}</td>
                        <td className="px-4 py-3"><StatusBadge status={u.isActive ? "active" : "inactive"} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setViewing(u)}>
                              <Eye className="h-4 w-4 mr-1" /> {t("superAdmin.viewStudent")}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleActive(u.id, u.isActive)}>
                              {u.isActive ? t("superAdmin.deactivate") : t("superAdmin.activate")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
      <StudentAnalyticsDialog user={viewing} open={!!viewing} onOpenChange={(v) => !v && setViewing(null)} />
    </div>
  );
}
