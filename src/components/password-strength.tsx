import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

function scorePassword(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export function PasswordStrength({ value }: { value: string }) {
  const { t } = useTranslation();
  const score = scorePassword(value);
  if (!value) return null;

  const labels = [t("auth.pwWeak"), t("auth.pwWeak"), t("auth.pwFair"), t("auth.pwGood"), t("auth.pwStrong")];
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-warning",
    "bg-primary-glow",
    "bg-success",
  ];

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? colors[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[score]}</p>
    </div>
  );
}
