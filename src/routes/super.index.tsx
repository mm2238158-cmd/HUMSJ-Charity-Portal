import { createFileRoute, Link } from "@tanstack/react-router";
import { useAllUsers, useAllContributions, useActiveMonth } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Users, Wallet, Clock, CalendarDays, BarChart3 } from "lucide-react";
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
    const totalThisMonth = items
      .filter((c) => c.status === "approved" && c.monthId === month?.id)
      .reduce((s, c) => s + (c.amount ?? 0), 0);
    const pending = items.filter((c) => c.status === "pending").length;
    return { totalThisMonth, pending };
  }, [items, month?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{t("nav.dashboard")}</h1>
        <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
          <Link to="/super/analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t("nav.analytics")}
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile icon={<Users className="h-4 w-4" />} label={t("superAdmin.totalUsers")} value={String(users.length)} />
        <Tile icon={<Wallet className="h-4 w-4" />} label={t("superAdmin.contributedThisMonth")} value={`${stats.totalThisMonth} ETB`} accent="success" />
        <Link to="/super/contributions" className="contents">
          <Tile icon={<Clock className="h-4 w-4" />} label={t("superAdmin.pendingAcrossAll")} value={String(stats.pending)} accent={stats.pending > 0 ? "warn" : undefined} />
        </Link>
        <Tile icon={<CalendarDays className="h-4 w-4" />} label={t("student.activeMonth")} value={month?.name ?? "—"} />
      </div>

      <Card className="shadow-soft md:hidden">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-3">{t("nav.analytics")}</p>
          <Button asChild className="w-full">
            <Link to="/super/analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("nav.analytics")}
            </Link>
          </Button>
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
