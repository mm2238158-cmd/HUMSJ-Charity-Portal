import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useActiveMonth, useSettings, useUserContributions } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Loader2, UploadCloud, X } from "lucide-react";

export const Route = createFileRoute("/app/pay")({
  component: PayPage,
});

function PayPage() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { month } = useActiveMonth();
  const { settings } = useSettings();
  const { items } = useUserContributions(user?.uid);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings) setAmount(settings.contributionAmount);
  }, [settings]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const existing = items.find((c) => c.monthId === month?.id);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !month) return;
    if (existing) {
      toast.error(t("student.alreadyPaid"));
      return;
    }
    if (!file) {
      toast.error(t("student.uploadScreenshot"));
      return;
    }
    if (!amount || amount <= 0) {
      toast.error(t("student.amount"));
      return;
    }
    setBusy(true);
    try {
      const path = `contributions/${user.uid}/${month.id}-${Date.now()}.jpg`;
      const sRef = ref(storage, path);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      const contribId = `${user.uid}_${month.id}`;
      await setDoc(doc(db, "contributions", contribId), {
        userId: user.uid,
        adminId: profile.assignedAdminId ?? null,
        monthId: month.id,
        amount,
        screenshotUrl: url,
        status: "pending",
        submittedAt: serverTimestamp(),
        approvedAt: null,
        approvedBy: null,
        rejectionReason: null,
      });

      // Notify the user
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        title: t("student.payContribution"),
        message: `${month.name} — ${amount} ETB submitted`,
        type: "system",
        isRead: false,
        createdAt: serverTimestamp(),
      });

      // Notify admin
      if (profile.assignedAdminId) {
        await addDoc(collection(db, "notifications"), {
          userId: profile.assignedAdminId,
          title: t("admin.pendingApprovals"),
          message: `${profile.fullName} — ${month.name}`,
          type: "approval",
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }

      toast.success(t("common.success"));
      navigate({ to: "/app" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("student.payContribution")}</h1>
        {month && <p className="text-sm text-muted-foreground">{month.name}</p>}
      </div>

      {existing && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="p-4 text-sm font-medium text-warning">
            {t("student.alreadyPaid")}
          </CardContent>
        </Card>
      )}

      <form onSubmit={onSubmit}>
        <Card className="shadow-soft">
          <CardContent className="p-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="amount">{t("student.amount")}</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("student.uploadScreenshot")}</Label>
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={preview} alt="preview" className="w-full max-h-80 object-contain bg-muted" />
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 rounded-full bg-background/90 p-1.5 hover:bg-background"
                    aria-label="remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <UploadCloud className="h-8 w-8" />
                  <span className="text-sm font-medium">{t("student.dropOrTap")}</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={busy || !!existing}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("student.submit")}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
