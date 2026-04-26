import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Home,
  Bell,
  Settings as SettingsIcon,
  History,
  Users,
  CheckCircle2,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export function useNavItems(): NavItem[] {
  const { t } = useTranslation();
  const { role } = useAuth();
  if (role === "super-admin") {
    return [
      { to: "/super", icon: LayoutDashboard, label: t("nav.dashboard") },
      { to: "/super/contributions", icon: CheckCircle2, label: t("nav.approvals") },
      { to: "/super/users", icon: Users, label: t("nav.users") },
      { to: "/super/admins", icon: Shield, label: t("nav.admins") },
      { to: "/super/settings", icon: SettingsIcon, label: t("nav.settings") },
    ];
  }
  if (role === "admin") {
    return [
      { to: "/admin", icon: LayoutDashboard, label: t("nav.dashboard") },
      { to: "/admin/users", icon: Users, label: t("nav.users") },
      { to: "/admin/approvals", icon: CheckCircle2, label: t("nav.approvals") },
      { to: "/admin/settings", icon: SettingsIcon, label: t("nav.settings") },
    ];
  }
  return [
    { to: "/app", icon: Home, label: t("nav.home") },
    { to: "/app/history", icon: History, label: t("nav.history") },
    { to: "/app/notifications", icon: Bell, label: t("nav.notifications") },
    { to: "/app/settings", icon: SettingsIcon, label: t("nav.settings") },
  ];
}

export function BottomNav() {
  const items = useNavItems();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/app" && it.to !== "/admin" && it.to !== "/super" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopSidebar() {
  const items = useNavItems();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <img src="/humsj-icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
        <div>
          <p className="text-sm font-bold leading-tight">{t("app.name")}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{t("app.tagline")}</p>
        </div>
      </div>
      <ul className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/app" && it.to !== "/admin" && it.to !== "/super" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
