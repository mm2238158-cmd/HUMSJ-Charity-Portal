import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { useUserContributions, useAllUsers } from "@/lib/data-hooks";
import type { UserDoc } from "@/lib/types";
import { Wallet, CheckCircle2, Clock, XCircle, CalendarDays, TrendingUp } from "lucide-react";

function fmtDate(ts: { toDate?: () => Date } | null | undefined) {
  const d = ts?.toDate?.();
  if (!d) return "—";
  return d.toLocaleDateString();
}

export function StudentAnalyticsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserDoc | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { items } = useUserContributions(user?.id);
  const { users } = useAllUsers();

  const stats = useMemo(() => {
    const approved = items.filter((c) => c.status === "approved");
    const pending = items.filter((c) => c.status === "pending").length;
    const rejected = items.filter((c) => c.status === "rejected").length;
    const late = items.filter((c) => c.late).length;
    const total = approved.reduce((s, c) => s + (c.amount ?? 0), 0);
    const monthsCovered = new Set(approved.map((c) => c.monthId));
    const avg = monthsCovered.size ? Math.round(total / monthsCovered.size) : 0;
    return { total, pending, rejected, late, approved: approved.length, monthsCovered: monthsCovered.size, avg };
  }, [items]);

  const assignedAdmin = users.find((u) => u.id === user?.assignedAdminId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user?.fullName ?? "—"}</DialogTitle>
          <DialogDescription>{t("superAdmin.studentAnalytics")}</DialogDescription>
        </DialogHeader>

        {user && (
          <div className="space-y-5">
            {/* Profile */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label={t("auth.email")} value={user.email} />
              <Info label={t("auth.phone")} value={user.phone} />
              <Info label={t("auth.gender")} value={user.gender} />
              <Info label={t("common.role")} value={user.role} />
              <Info label={t("common.status")} value={user.isActive ? t("status.active") : t("status.inactive")} />
              {assignedAdmin && <Info label={t("common.admin")} value={assignedAdmin.fullName} />}
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Tile icon={<Wallet className="h-4 w-4" />} label={t("analytics.totalApproved")} value={`${stats.total} ETB`} accent="success" />
              <Tile icon={<TrendingUp className="h-4 w-4" />} label={t("analytics.avgPerMonth")} value={`${stats.avg} ETB`} />
              <Tile icon={<CalendarDays className="h-4 w-4" />} label={t("student.monthsActive")} value={String(stats.monthsCovered)} />
              <Tile icon={<CheckCircle2 className="h-4 w-4" />} label={t("status.approved")} value={String(stats.approved)} accent="success" />
              <Tile icon={<Clock className="h-4 w-4" />} label={t("status.pending")} value={String(stats.pending)} accent="warn" />
              <Tile icon={<XCircle className="h-4 w-4" />} label={t("status.rejected")} value={String(stats.rejected)} />
            </div>

            {/* Recent contributions */}
            <div>
              <h3 className="font-semibold mb-2">{t("analytics.recentContributions")}</h3>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("student.noHistory")}</p>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground bg-muted/40">
                      <tr>
                        <th className="px-3 py-2">{t("common.month")}</th>
                        <th className="px-3 py-2">{t("common.amount")}</th>
                        <th className="px-3 py-2">{t("common.status")}</th>
                        <th className="px-3 py-2">{t("common.date")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.slice(0, 10).map((c) => (
                        <tr key={c.id} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{c.monthId}</td>
                          <td className="px-3 py-2">{c.amount} ETB</td>
                          <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDate(c.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate capitalize">{value}</p>
    </div>
  );
}

function Tile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: "success" | "warn" }) {
  const bg =
    accent === "success" ? "bg-success/10 text-success"
    : accent === "warn" ? "bg-warning/15 text-warning"
    : "bg-primary/10 text-primary";
  return (
    <div className="rounded-lg border border-border p-3">
      <div className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${bg}`}>{icon}</div>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}
