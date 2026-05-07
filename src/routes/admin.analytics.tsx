import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAdminAssignedUsers, useAllContributions, useActiveMonth } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Wallet, TrendingUp, CheckCircle2, XCircle, Clock, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { users } = useAdminAssignedUsers(user?.uid);
  const { items: all } = useAllContributions();
  const { month } = useActiveMonth();

  const stats = useMemo(() => {
    const mine = all.filter((c) => c.adminId === user?.uid);
    const approved = mine.filter((c) => c.status === "approved");
    const totalThisMonth = approved.filter((c) => c.monthId === month?.id).reduce((s, c) => s + (c.amount ?? 0), 0);
    const totalAllTime = approved.reduce((s, c) => s + (c.amount ?? 0), 0);
    const approvedCount = approved.filter((c) => c.monthId === month?.id).length;
    const rejectedCount = mine.filter((c) => c.monthId === month?.id && c.status === "rejected").length;
    const pending = mine.filter((c) => c.status === "pending").length;
    const activeStudents = users.filter((u) => u.isActive !== false).length;
    const participationPct = activeStudents ? Math.round((approvedCount / activeStudents) * 100) : 0;

    const totals = new Map<string, number>();
    for (const c of approved) totals.set(c.userId, (totals.get(c.userId) ?? 0) + (c.amount ?? 0));
    const top = [...totals.entries()]
      .map(([uid, amt]) => ({ user: users.find((u) => u.id === uid), amt }))
      .filter((x) => x.user)
      .sort((a, b) => b.amt - a.amt)
      .slice(0, 5);

    const byMonth = new Map<string, number>();
    for (const c of approved) byMonth.set(c.monthId, (byMonth.get(c.monthId) ?? 0) + (c.amount ?? 0));
    const trend = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6).reverse();
    const trendMax = Math.max(1, ...trend.map(([, v]) => v));

    return { totalThisMonth, totalAllTime, approvedCount, rejectedCount, pending, participationPct, top, trend, trendMax };
  }, [all, users, user?.uid, month?.id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.analytics")}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Tile icon={<Wallet className="h-4 w-4" />} label={t("superAdmin.contributedThisMonth")} value={`${stats.totalThisMonth} ETB`} accent="success" />
        <Tile icon={<TrendingUp className="h-4 w-4" />} label={t("superAdmin.totalContributedAllTime")} value={`${stats.totalAllTime} ETB`} accent="success" />
        <Tile icon={<CheckCircle2 className="h-4 w-4" />} label={t("superAdmin.approvedThisMonth")} value={String(stats.approvedCount)} accent="success" />
        <Tile icon={<XCircle className="h-4 w-4" />} label={t("superAdmin.rejectedThisMonth")} value={String(stats.rejectedCount)} />
        <Tile icon={<Clock className="h-4 w-4" />} label={t("admin.pendingApprovals")} value={String(stats.pending)} accent={stats.pending > 0 ? "warn" : undefined} />
        <Tile icon={<CalendarDays className="h-4 w-4" />} label={t("superAdmin.participationRate")} value={`${stats.participationPct}%`} />
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
