import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAllUsers, useAllContributions, useActiveMonth } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { TrendingUp, CheckCircle2, XCircle, Wallet, CalendarDays, Users, Shield, Activity } from "lucide-react";

export const Route = createFileRoute("/super/analytics")({
  component: SuperAnalytics,
});

function SuperAnalytics() {
  const { t } = useTranslation();
  const { users } = useAllUsers();
  const { items } = useAllContributions();
  const { month } = useActiveMonth();

  const stats = useMemo(() => {
    const approved = items.filter((c) => c.status === "approved");
    const totalThisMonth = approved.filter((c) => c.monthId === month?.id).reduce((s, c) => s + (c.amount ?? 0), 0);
    const totalAllTime = approved.reduce((s, c) => s + (c.amount ?? 0), 0);
    const approvedCount = approved.filter((c) => c.monthId === month?.id).length;
    const rejectedCount = items.filter((c) => c.monthId === month?.id && c.status === "rejected").length;
    const activeStudents = users.filter((u) => u.role === "student" && u.isActive !== false).length;
    const participationPct = activeStudents ? Math.round((approvedCount / activeStudents) * 100) : 0;
    const avgPerStudent = approvedCount ? Math.round(totalThisMonth / approvedCount) : 0;
    const admins = users.filter((u) => u.role === "admin").length;
    const students = users.filter((u) => u.role === "student").length;

    // top contributors
    const totals = new Map<string, number>();
    for (const c of approved) totals.set(c.userId, (totals.get(c.userId) ?? 0) + (c.amount ?? 0));
    const top = [...totals.entries()]
      .map(([uid, amt]) => ({ user: users.find((u) => u.id === uid), amt }))
      .filter((x) => x.user)
      .sort((a, b) => b.amt - a.amt)
      .slice(0, 5);

    // last 6 months trend
    const byMonth = new Map<string, number>();
    for (const c of approved) byMonth.set(c.monthId, (byMonth.get(c.monthId) ?? 0) + (c.amount ?? 0));
    const trend = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6).reverse();
    const trendMax = Math.max(1, ...trend.map(([, v]) => v));

    return { totalThisMonth, totalAllTime, approvedCount, rejectedCount, participationPct, avgPerStudent, admins, students, top, trend, trendMax };
  }, [items, users, month?.id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.analytics")}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Tile icon={<Wallet className="h-4 w-4" />} label={t("superAdmin.contributedThisMonth")} value={`${stats.totalThisMonth} ETB`} accent="success" />
        <Tile icon={<TrendingUp className="h-4 w-4" />} label={t("superAdmin.totalContributedAllTime")} value={`${stats.totalAllTime} ETB`} accent="success" />
        <Tile icon={<CheckCircle2 className="h-4 w-4" />} label={t("superAdmin.approvedThisMonth")} value={String(stats.approvedCount)} accent="success" />
        <Tile icon={<XCircle className="h-4 w-4" />} label={t("superAdmin.rejectedThisMonth")} value={String(stats.rejectedCount)} />
        <Tile icon={<CalendarDays className="h-4 w-4" />} label={t("superAdmin.participationRate")} value={`${stats.participationPct}%`} />
        <Tile icon={<Wallet className="h-4 w-4" />} label={t("superAdmin.avgPerStudent")} value={`${stats.avgPerStudent} ETB`} />
        <Tile icon={<Shield className="h-4 w-4" />} label={t("nav.admins")} value={String(stats.admins)} />
        <Tile icon={<Activity className="h-4 w-4" />} label={t("common.student")} value={String(stats.students)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3">{t("analytics.trend")}</h2>
            {stats.trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("student.noHistory")}</p>
            ) : (
              <div className="space-y-2">
                {stats.trend.map(([mid, amt]) => (
                  <div key={mid}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{mid}</span>
                      <span className="text-muted-foreground">{amt} ETB</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-primary" style={{ width: `${(amt / stats.trendMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3">{t("analytics.topContributors")}</h2>
            {stats.top.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("student.noHistory")}</p>
            ) : (
              <ul className="space-y-2">
                {stats.top.map((row, i) => (
                  <li key={row.user!.id} className="flex items-center gap-3 text-sm">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
                    <span className="flex-1 truncate font-medium">{row.user!.fullName}</span>
                    <span className="text-muted-foreground">{row.amt} ETB</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3 inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("superAdmin.roleBreakdown")}
          </h2>
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
    accent === "success" ? "bg-success/10 text-success"
    : accent === "warn" ? "bg-warning/15 text-warning"
    : "bg-primary/10 text-primary";
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
        <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold truncate">{value}</p>
      </CardContent>
    </Card>
  );
}
