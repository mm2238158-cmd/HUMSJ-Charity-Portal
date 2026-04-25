import { useEffect, useState, type ReactNode } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { useAuth, friendlyAuthError } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import logo from "@/assets/humsj-logo.png";

export function EmailVerificationGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, signOut, refreshUser } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  if (!user) return <>{children}</>;
  const isPassword = user.providerData.some((p) => p.providerId === "password");
  if (!isPassword || user.emailVerified) return <>{children}</>;

  const onResend = async () => {
    if (cooldown > 0 || !auth.currentUser) return;
    setBusy(true);
    try {
      await sendEmailVerification(auth.currentUser, {
        url: window.location.origin + "/login",
        handleCodeInApp: false,
      });
      toast.success(t("auth.verifySent"));
      setCooldown(60);
    } catch (err) {
      toast.error(friendlyAuthError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const onRefresh = async () => {
    setBusy(true);
    try {
      await refreshUser();
      if (auth.currentUser?.emailVerified) {
        toast.success(t("common.success"));
      } else {
        toast.error(t("auth.verifyFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="HUMSJ" className="h-16 w-16 rounded-2xl shadow-elegant" />
        </div>
        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold">{t("auth.verifyTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("auth.verifySubtitle")}{" "}
              <span className="font-medium text-foreground">{user.email}</span>
            </p>
            <div className="mt-6 space-y-2">
              <Button onClick={onRefresh} className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("auth.refresh")}
              </Button>
              <Button
                onClick={onResend}
                variant="outline"
                className="w-full"
                disabled={busy || cooldown > 0}
              >
                {cooldown > 0
                  ? `${t("auth.resendCooldown")} (${cooldown}s)`
                  : t("auth.resend")}
              </Button>
              <Button onClick={() => signOut()} variant="ghost" className="w-full">
                {t("auth.signOut")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
