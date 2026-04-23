import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useActiveMonth, useUserContributions } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CalendarDays, Wallet, Clock, TrendingUp } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/app/")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { month, loading: mLoading } = useActiveMonth();
  const { items, loading: cLoading } = useUserContributions(profile?.id);

  const activeContribution = useMemo(
    () => items.find((c) => c.monthId === month?.id),
    [items, month?.id],
  );
  const totalApproved = items
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + (c.amount ?? 0), 0);
  const lastPayment = items.find((c) => c.status === "approved");
  const monthsActive = new Set(
    items.filter((c) => c.status === "approved").map((c) => c.monthId),
  ).size;

  const dueDate = month?.dueDate?.toDate?.();
  const isLate =
    !activeContribution &&
    dueDate &&
    dueDate.getTime() < Date.now();

  const status: "paid" | "pending" | "rejected" | "late" = activeContribution
    ? activeContribution.status === "approved"
      ? "paid"
      : activeContribution.status === "rejected"
        ? "rejected"
        : "pending"
    : isLate
      ? "late"
      : "pending";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{t("auth.welcome")}</p>
        <h1 className="text-2xl font-bold">{profile?.fullName}</h1>
      </div>

      <Card className="overflow-hidden border-0 shadow-elegant">
        <div className="bg-gradient-primary text-primary-foreground p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-90">
                {t("student.activeMonth")}
              </p>
              {mLoading ? (
                <Skeleton className="h-7 w-32 mt-1 bg-white/20" />
              ) : (
                <p className="text-2xl font-bold mt-1">{month?.name ?? "—"}</p>
              )}
              {dueDate && (
                <p className="text-xs opacity-90 mt-1 flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Due {format(dueDate, "MMM d, yyyy")}
                </p>
              )}
            </div>
            <StatusBadge
              status={status}
              className="bg-white/20 border-white/30 text-white"
            />
          </div>
          <div className="mt-6 flex gap-2">
            <Link to="/app/pay" className="flex-1">
              <Button
                disabled={!!activeContribution || !month}
                className="w-full bg-white text-primary hover:bg-white/90 font-semibold"
                size="lg"
              >
                {activeContribution ? t("student.alreadyPaid") : t("student.payNow")}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile
          icon={<Wallet className="h-4 w-4" />}
          label={t("student.totalContributed")}
          value={cLoading ? "…" : `${totalApproved} ETB`}
        />
        <StatTile
          icon={<Clock className="h-4 w-4" />}
          label={t("student.lastPayment")}
          value={
            cLoading
              ? "…"
              : lastPayment?.submittedAt?.toDate
                ? format(lastPayment.submittedAt.toDate(), "MMM d")
                : "—"
          }
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("student.monthsActive")}
          value={cLoading ? "…" : String(monthsActive)}
        />
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {icon}
          <span className="font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className="mt-2 text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
