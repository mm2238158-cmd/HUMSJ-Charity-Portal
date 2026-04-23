import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";
import "@/i18n";
import { useTranslation } from "react-i18next";
import { registerPWA } from "@/lib/pwa";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#1a9e9e" },
      { title: "HUMSJ Charity Portal" },
      {
        name: "description",
        content:
          "Haramaya University Muslim Students Jeme'a — monthly contribution portal.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/humsj-icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/humsj-icon-192.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function LangSync() {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  useEffect(() => {
    if (profile?.language && profile.language !== i18n.language) {
      void i18n.changeLanguage(profile.language);
    }
  }, [profile?.language, i18n]);
  return null;
}

function RouteBodyClass() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const isAppRoute =
      path.startsWith("/app") ||
      path.startsWith("/admin") ||
      path.startsWith("/super");
    document.body.classList.toggle("has-bottom-nav", isAppRoute);
  }, [path]);
  return null;
}

function RootComponent() {
  useEffect(() => {
    registerPWA();
  }, []);
  return (
    <ThemeProvider>
      <AuthProvider>
        <LangSync />
        <RouteBodyClass />
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </ThemeProvider>
  );
}
