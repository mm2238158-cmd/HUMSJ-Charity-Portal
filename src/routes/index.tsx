import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import logo from "@/assets/humsj-logo.png";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!profile) return;
    if (profile.role === "super-admin") navigate({ to: "/super" });
    else if (profile.role === "admin") navigate({ to: "/admin" });
    else navigate({ to: "/app" });
  }, [user, profile, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft">
      <div className="flex flex-col items-center gap-4">
        <img src={logo} alt="HUMSJ" className="h-20 w-20 animate-pulse rounded-2xl" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
