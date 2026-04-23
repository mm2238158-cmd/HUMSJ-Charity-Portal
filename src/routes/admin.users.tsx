import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useAdminAssignedUsers } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { users, loading } = useAdminAssignedUsers(user?.uid);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("admin.assignedUsers")}</h1>
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : users.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-10 flex flex-col items-center text-center gap-3 text-muted-foreground">
            <Users className="h-10 w-10" />
            <p>{t("admin.noUsers")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <Card key={u.id} className="shadow-soft">
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary text-primary-foreground">{u.fullName?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <StatusBadge status={u.isActive ? "active" : "inactive"} />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="hidden md:block shadow-soft">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                  <tr><th className="px-4 py-3">{t("common.name")}</th><th className="px-4 py-3">{t("auth.email")}</th><th className="px-4 py-3">{t("auth.phone")}</th><th className="px-4 py-3">{t("common.status")}</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{u.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.phone}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.isActive ? "active" : "inactive"} /></td>
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
