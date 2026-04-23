import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAdminPendingContributions, getUserDoc } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, X, Image as ImageIcon } from "lucide-react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import type { ContributionDoc, UserDoc } from "@/lib/types";

export const Route = createFileRoute("/admin/approvals")({
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, loading } = useAdminPendingContributions(user?.uid);
  const [userMap, setUserMap] = useState<Record<string, UserDoc>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<ContributionDoc | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    items.forEach(async (c) => {
      if (!userMap[c.userId]) {
        const u = await getUserDoc(c.userId);
        if (u) setUserMap((prev) => ({ ...prev, [c.userId]: u }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const approve = async (c: ContributionDoc) => {
    if (!user) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "contributions", c.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
        rejectionReason: null,
      });
      await addDoc(collection(db, "notifications"), {
        userId: c.userId,
        title: t("status.approved"),
        message: `${c.amount} ETB`,
        type: "approval",
        isRead: false,
        createdAt: serverTimestamp(),
      });
      toast.success(t("status.approved"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!rejectFor || !user) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "contributions", rejectFor.id), {
        status: "rejected",
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
        rejectionReason: reason || "Rejected",
      });
      await addDoc(collection(db, "notifications"), {
        userId: rejectFor.userId,
        title: t("status.rejected"),
        message: reason || "Your contribution was rejected",
        type: "approval",
        isRead: false,
        createdAt: serverTimestamp(),
      });
      toast.success(t("status.rejected"));
      setRejectFor(null);
      setReason("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("admin.pendingApprovals")}</h1>
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-10 flex flex-col items-center text-center gap-3 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10" />
            <p>{t("admin.noPending")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((c) => {
            const u = userMap[c.userId];
            return (
              <Card key={c.id} className="shadow-soft overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{u?.fullName ?? "…"}</p>
                      <p className="text-xs text-muted-foreground">{c.monthId} · {c.amount} ETB</p>
                    </div>
                    <button
                      onClick={() => setPreviewUrl(c.screenshotUrl)}
                      className="text-xs flex items-center gap-1 text-primary hover:underline"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {t("admin.viewScreenshot")}
                    </button>
                  </div>
                  <button
                    onClick={() => setPreviewUrl(c.screenshotUrl)}
                    className="block w-full"
                  >
                    <img src={c.screenshotUrl} alt="proof" className="w-full h-40 object-cover rounded-lg border border-border" />
                  </button>
                  <div className="flex gap-2">
                    <Button onClick={() => approve(c)} disabled={busy} className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {t("admin.approve")}
                    </Button>
                    <Button onClick={() => setRejectFor(c)} disabled={busy} variant="destructive" className="flex-1">
                      <X className="h-4 w-4 mr-1" />
                      {t("admin.reject")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{t("admin.viewScreenshot")}</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="screenshot" className="w-full max-h-[70vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("admin.rejectReason")}</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("admin.rejectReason")} rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectFor(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={reject} disabled={busy}>{t("admin.reject")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
