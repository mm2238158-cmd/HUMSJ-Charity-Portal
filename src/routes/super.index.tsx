import { createFileRoute, Link } from "@tanstack/react-router";
import { useAllUsers, useAllContributions, useActiveMonth } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Users, Wallet, Activity, Shield, Clock, TrendingUp, CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/super/")({
  component: SuperDashboard,
});

function SuperDashboard() {
  const { t } = useTranslation();
  const { users } = useAllUsers();
  const { items } = useAllContributions();
  const { month } = useActiveMonth();

  const stats = useMemo(() => {
    const approved = items.filter((c) => c.status === "approved");
    const totalThisMonth = approved
      .filter((c) => c.monthId === month?.id)
      .reduce((s, c) => s + (c.amount ?? 0), 0);
    const totalAllTime = approved.reduce((s, c) => s + (c.amount ?? 0), 0);
    const approvedThisMonthCount = approved.filter((c) => c.monthId === month?.id).length;
    const rejectedThisMonth = items.filter(
      (c) => c.monthId === month?.id && c.status === "rejected",
    ).length;
    const admins = users.filter((u) => u.role === "admin").length;
    const students = users.filter((u) => u.role === "student").length;
    const pending = items.filter((c) => c.status === "pending").length;
    const activeStudents = users.filter((u) => u.role === "student" && u.isActive !== false).length;
    const participationPct = activeStudents
      ? Math.round((approvedThisMonthCount / activeStudents) * 100)
      : 0;
    const avgPerStudent = approvedThisMonthCount
      ? Math.round(totalThisMonth / approvedThisMonthCount)
      : 0;
    return {
      totalThisMonth,
      totalAllTime,
      approvedThisMonthCount,
      rejectedThisMonth,
      admins,
      students,
      pending,
      participationPct,
      avgPerStudent,
    };
  }, [items, month?.id, users]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.dashboard")}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Tile icon={<Users className="h-4 w-4" />} label={t("superAdmin.totalUsers")} value={String(users.length)} />
        <Tile icon={<Wallet className="h-4 w-4" />} label={t("superAdmin.contributedThisMonth")} value={`${stats.totalThisMonth} ETB`} accent="success" />
        <Tile icon={<TrendingUp className="h-4 w-4" />} label={t("superAdmin.totalContributedAllTime")} value={`${stats.totalAllTime} ETB`} accent="success" />
        <Tile icon={<CheckCircle2 className="h-4 w-4" />} label={t("superAdmin.approvedThisMonth")} value={String(stats.approvedThisMonthCount)} accent="success" />
        <Tile icon={<XCircle className="h-4 w-4" />} label={t("superAdmin.rejectedThisMonth")} value={String(stats.rejectedThisMonth)} />
        <Link to="/super/contributions" className="contents">
          <Tile icon={<Clock className="h-4 w-4" />} label={t("superAdmin.pendingAcrossAll")} value={String(stats.pending)} accent={stats.pending > 0 ? "warn" : undefined} />
        </Link>
        <Tile icon={<CalendarDays className="h-4 w-4" />} label={t("superAdmin.participationRate")} value={`${stats.participationPct}%`} />
        <Tile icon={<Wallet className="h-4 w-4" />} label={t("superAdmin.avgPerStudent")} value={`${stats.avgPerStudent} ETB`} />
        <Tile icon={<Shield className="h-4 w-4" />} label={t("nav.admins")} value={String(stats.admins)} />
        <Tile icon={<Activity className="h-4 w-4" />} label={t("common.student")} value={String(stats.students)} />
      </div>
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3">{t("superAdmin.roleBreakdown")}</h2>
          <div className="space-y-2">
            {(["super-admin", "admin", "student"] as const).map((r) => {
              const count = users.filter((u) => u.role === r).length;
              const pct = users.length ? (count / users.length) * 100 : 0;
              return (
                <div key={r}>
                  <div className="flex justify-between text-xs mb-1"><span className="capitalize">{r}</span><span className="text-muted-foreground">{count}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: "success" | "warn" }) {
  const bg =
    accent === "success"
      ? "bg-success/10 text-success"
      : accent === "warn"
      ? "bg-warning/15 text-warning"
      : "bg-primary/10 text-primary";
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
        <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
