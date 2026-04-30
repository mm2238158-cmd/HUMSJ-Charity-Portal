import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/icon-input";
import { PasswordInput } from "@/components/password-input";
import { GoogleButton } from "@/components/google-button";
import { AuthLayout } from "@/components/auth-layout";
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog";
import { toast } from "sonner";
import { Loader2, Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const { signIn, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success(t("common.success"));
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      await signInGoogle();
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t("auth.welcome")} subtitle={t("auth.welcomeSub")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm">{t("auth.email")}</Label>
          <IconInput
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            leadingIcon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm">{t("auth.password")}</Label>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setForgotOpen(true)}
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            minLength={6}
            placeholder="••••••••"
            leadingIcon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-elegant hover:opacity-95 transition-opacity"
        >
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {busy ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("auth.or")}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton onClick={onGoogle} loading={busy} label={t("auth.google")} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          {t("auth.signUp")}
        </Link>
      </p>
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} initialEmail={email} />
    </AuthLayout>
  );
}
