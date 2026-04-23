import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  useAdminAssignedUsers,
  useAdminPendingContributions,
  useActiveMonth,
  useAllContributions,
} from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Users as UsersIcon, Clock, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { users } = useAdminAssignedUsers(user?.uid);
  const { items: pending } = useAdminPendingContributions(user?.uid);
  const { month } = useActiveMonth();
  const { items: all } = useAllContributions();

  const approvedThisMonth = useMemo(
    () =>
      all.filter(
        (c) =>
          c.adminId === user?.uid &&
          c.monthId === month?.id &&
          c.status === "approved",
      ).length,
    [all, user?.uid, month?.id],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{t("nav.dashboard")}</p>
        <h1 className="text-2xl font-bold">{profile?.fullName}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tile icon={<UsersIcon className="h-4 w-4" />} label={t("admin.assignedUsers")} value={users.length} />
        <Tile icon={<Clock className="h-4 w-4" />} label={t("admin.pendingApprovals")} value={pending.length} accent="warning" />
        <Tile icon={<CheckCircle2 className="h-4 w-4" />} label={t("admin.approvedThisMonth")} value={approvedThisMonth} accent="success" />
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "success" | "warning";
}) {
  const accentBg =
    accent === "success" ? "bg-success/10 text-success" : accent === "warning" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary";
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${accentBg}`}>{icon}</div>
        <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
