import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HeartHandshake, ShieldCheck, Users } from "lucide-react";
import logo from "@/assets/humsj-logo.png";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-background grid lg:grid-cols-2">
      {/* Brand panel — hidden on mobile, decorative on desktop */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-primary-foreground bg-[image:var(--gradient-primary)]">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-black/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

        <div className="relative flex items-center gap-3">
          <img src={logo} alt="HUMSJ" className="h-11 w-11 rounded-xl bg-white/15 p-1.5 backdrop-blur-sm shadow-lg" />
          <div>
            <p className="text-base font-semibold leading-tight">{t("app.name")}</p>
            <p className="text-xs text-primary-foreground/80">{t("app.tagline")}</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              {t("auth.brandHeadline")}
            </h2>
            <p className="text-base text-primary-foreground/85 leading-relaxed">
              {t("auth.brandSubline")}
            </p>
          </div>

          <ul className="space-y-4">
            {[
              { Icon: HeartHandshake, text: t("auth.valueProp1") },
              { Icon: ShieldCheck, text: t("auth.valueProp2") },
              { Icon: Users, text: t("auth.valueProp3") },
            ].map(({ Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2.25} />
                </span>
                <p className="text-sm text-primary-foreground/90 leading-relaxed pt-1.5">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} {t("app.name")}
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        {/* subtle bg only on mobile (no brand panel) */}
        <div className="lg:hidden pointer-events-none absolute inset-0 bg-[image:var(--gradient-soft)]" />

        <div className="relative w-full max-w-md">
          {/* Mobile compact brand header */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <img src={logo} alt="HUMSJ" className="h-14 w-14 rounded-2xl shadow-elegant" />
            <p className="mt-3 text-base font-semibold">{t("app.name")}</p>
            <p className="text-xs text-muted-foreground">{t("app.tagline")}</p>
          </div>

          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-elegant">
            <div className="mb-6 space-y-1">
              <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
