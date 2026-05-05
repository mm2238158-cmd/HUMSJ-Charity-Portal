import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconInput } from "@/components/icon-input";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrength } from "@/components/password-strength";
import { GoogleButton } from "@/components/google-button";
import { AuthLayout } from "@/components/auth-layout";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Phone } from "lucide-react";
import type { Gender } from "@/lib/types";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { t } = useTranslation();
  const { signUp, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const ETHIOPIAN_PHONE = /^\+251(7|9)\d{8}$/;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error(t("auth.nameRequired"));
    if (!phone.trim()) return toast.error(t("auth.phoneRequired"));
    if (!ETHIOPIAN_PHONE.test(phone.trim())) return toast.error(t("auth.phoneFormat"));
    if (!gender) return toast.error(t("auth.genderRequired"));
    if (password.length < 6) return toast.error(t("auth.passwordShort"));
    if (password !== confirmPassword) return toast.error(t("auth.passwordMismatch"));
    setBusy(true);
    try {
      const result = await signUp({ fullName, phone: phone.trim(), gender: gender as Gender, email, password });
      if (result.verificationSent) {
        toast.success(t("auth.accountCreated"));
      } else {
        toast.warning(
          `${t("auth.verifySendFailed")}: ${result.verificationError ?? ""}`,
          { duration: 8000 },
        );
      }
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
    <AuthLayout title={t("auth.createTitle")} subtitle={t("auth.createSub")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm">{t("auth.fullName")}</Label>
          <IconInput
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder={t("auth.namePlaceholder")}
            leadingIcon={User}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm">{t("auth.email")}</Label>
          <IconInput
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            leadingIcon={Mail}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm">{t("auth.phone")}</Label>
            <IconInput
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="+251912345678"
              inputMode="tel"
              leadingIcon={Phone}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t("auth.gender")}</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
              <SelectTrigger className="h-11 rounded-lg bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("auth.male")}</SelectItem>
                <SelectItem value="female">{t("auth.female")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">{t("auth.phoneFormat")}</p>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm">{t("auth.password")}</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            leadingIcon={Lock}
          />
          <PasswordStrength value={password} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm">{t("auth.confirmPassword")}</Label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            leadingIcon={Lock}
          />
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-elegant hover:opacity-95 transition-opacity"
        >
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {busy ? t("auth.creatingAccount") : t("auth.signUp")}
        </Button>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          {t("auth.terms")}
        </p>
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
        {t("auth.haveAccount")}{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </AuthLayout>
  );
}
