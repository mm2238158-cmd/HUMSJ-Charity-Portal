import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/icon-input";
import { useAuth } from "@/lib/auth-context";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}

export function ForgotPasswordDialog({ open, onOpenChange, initialEmail = "" }: ForgotPasswordDialogProps) {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setEmail(initialEmail);
  }, [open, initialEmail]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await resetPassword(email);
      toast.success(t("auth.resetSent"));
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("auth.forgotPasswordTitle")}</DialogTitle>
          <DialogDescription>{t("auth.forgotPasswordSub")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className="text-sm">{t("auth.email")}</Label>
            <IconInput
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              leadingIcon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t("auth.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-95"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.sendResetLink")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
