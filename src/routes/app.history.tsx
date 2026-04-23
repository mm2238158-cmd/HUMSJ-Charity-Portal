import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useUserContributions, useMonths } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { History as HistoryIcon } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, loading } = useUserContributions(user?.uid);
  const { months } = useMonths();
  const monthMap = useMemo(() => Object.fromEntries(months.map((m) => [m.id, m.name])), [months]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("student.history")}</h1>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-10 flex flex-col items-center text-center gap-3 text-muted-foreground">
            <HistoryIcon className="h-10 w-10" />
            <p>{t("student.noHistory")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {items.map((c) => (
              <Card key={c.id} className="shadow-soft">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{monthMap[c.monthId] ?? c.monthId}</p>
                    <p className="text-sm text-muted-foreground">{c.amount} ETB</p>
                    {c.submittedAt?.toDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(c.submittedAt.toDate(), "MMM d, yyyy")}
                      </p>
                    )}
                    {c.status === "rejected" && c.rejectionReason && (
                      <p className="text-xs text-destructive mt-1">{c.rejectionReason}</p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block shadow-soft">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">{t("common.month")}</th>
                    <th className="px-4 py-3">{t("common.amount")}</th>
                    <th className="px-4 py-3">{t("common.date")}</th>
                    <th className="px-4 py-3">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{monthMap[c.monthId] ?? c.monthId}</td>
                      <td className="px-4 py-3">{c.amount} ETB</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.submittedAt?.toDate ? format(c.submittedAt.toDate(), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                        {c.status === "rejected" && c.rejectionReason && (
                          <p className="text-xs text-destructive mt-1">{c.rejectionReason}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
