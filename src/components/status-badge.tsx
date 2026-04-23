import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { ContributionStatus } from "@/lib/types";

const styles: Record<string, string> = {
  approved: "bg-success/15 text-success border-success/30",
  paid: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/40",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  late: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-300",
  active: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ContributionStatus | "paid" | "late" | "active" | "inactive";
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        styles[status] ?? styles.pending,
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
