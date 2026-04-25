import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { BottomNav, DesktopSidebar } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { EmailVerificationGate } from "@/components/email-verification-gate";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft">
      <img src="/humsj-icon-192.png" alt="" className="h-16 w-16 animate-pulse rounded-2xl" />
    </div>
  );
}

function AdminLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (profile && profile.role !== "admin" && profile.role !== "super-admin") {
      navigate({ to: "/app" });
    }
  }, [user, profile, loading, navigate]);

  if (loading || !user || !profile) return <FullScreenLoader />;
  if (profile.role !== "admin" && profile.role !== "super-admin") return <FullScreenLoader />;

  return (
    <EmailVerificationGate>
      <div className="min-h-screen flex bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader notificationsHref="/admin/notifications" />
          <main className="flex-1 px-4 py-5 md:px-8 md:py-8 max-w-6xl w-full mx-auto">
            <Outlet />
          </main>
          <BottomNav />
        </div>
      </div>
    </EmailVerificationGate>
  );
}
