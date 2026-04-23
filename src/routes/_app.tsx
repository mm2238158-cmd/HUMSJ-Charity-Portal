import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { BottomNav, DesktopSidebar } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft">
      <img src="/humsj-icon-192.png" alt="" className="h-16 w-16 animate-pulse rounded-2xl" />
    </div>
  );
}

function AppLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user || !profile) return <FullScreenLoader />;

  const notificationsHref =
    profile.role === "super-admin"
      ? "/super/notifications"
      : profile.role === "admin"
        ? "/admin/notifications"
        : "/app/notifications";

  return (
    <div className="min-h-screen flex bg-background">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader notificationsHref={notificationsHref} />
        <main className="flex-1 px-4 py-5 md:px-8 md:py-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
