import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Bell, BellOff } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { cn } from "@/lib/utils";

export function NotificationsList() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, loading } = useNotifications(user?.uid);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { isRead: true });
  };

  const markAll = async () => {
    const batch = writeBatch(db);
    items.filter((n) => !n.isRead).forEach((n) => {
      batch.update(doc(db, "notifications", n.id), { isRead: true });
    });
    await batch.commit();
  };

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("notifications.title")}</h1>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAll}>
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-10 flex flex-col items-center text-center gap-3 text-muted-foreground">
            <BellOff className="h-10 w-10" />
            <p>{t("notifications.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={cn(
                "w-full text-left rounded-xl border border-border p-4 flex gap-3 transition-colors",
                n.isRead ? "bg-card" : "bg-accent/40 hover:bg-accent",
              )}
            >
              <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", n.isRead ? "bg-transparent" : "bg-primary")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold truncate">{n.title}</p>
                  {n.createdAt?.toDate && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(n.createdAt.toDate(), "MMM d")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
