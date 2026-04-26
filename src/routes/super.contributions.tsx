import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAllContributions, useAllUsers, useMonths, getUserDoc } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, X, Image as ImageIcon, Search } from "lucide-react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import type { ContributionDoc, ContributionStatus, UserDoc } from "@/lib/types";

export const Route = createFileRoute("/super/contributions")({
  component: SuperContributions,
});

type StatusFilter = "all" | ContributionStatus | "late";

function SuperContributions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, loading } = useAllContributions();
  const { users } = useAllUsers();
  const { months } = useMonths();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<ContributionDoc | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [userMap, setUserMap] = useState<Record<string, UserDoc>>({});

  const usersById = useMemo(() => {
    const m: Record<string, UserDoc> = {};
    users.forEach((u) => (m[u.id] = u));
    return m;
  }, [users]);

  useEffect(() => {
    items.forEach(async (c) => {
      if (!usersById[c.userId] && !userMap[c.userId]) {
        const u = await getUserDoc(c.userId);
        if (u) setUserMap((prev) => ({ ...prev, [c.userId]: u }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, usersById]);

  const admins = users.filter((u) => u.role === "admin");

  const filtered = useMemo(() => {
    return items
      .filter((c) => {
        if (statusFilter === "late") return c.late === true;
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (monthFilter !== "all" && c.monthId !== monthFilter) return false;
        if (adminFilter !== "all" && (c.adminId ?? "") !== adminFilter) return false;
        if (q) {
          const u = usersById[c.userId] ?? userMap[c.userId];
          const hay = `${u?.fullName ?? ""} ${u?.email ?? ""}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0));
  }, [items, statusFilter, monthFilter, adminFilter, q, usersById, userMap]);

  const pendingCount = items.filter((c) => c.status === "pending").length;

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
        message: `${c.amount} ETB · ${c.monthId}`,
        type: "approval",
        isRead: false,
        createdAt: serverTimestamp(),
      });
      // courtesy notify the original assigned admin
      if (c.adminId && c.adminId !== user.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: c.adminId,
          title: t("superAdmin.actionByYou"),
          message: `${t("status.approved")} · ${usersById[c.userId]?.fullName ?? c.userId}`,
          type: "system",
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
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

  const reassignContribution = async (c: ContributionDoc, newAdminId: string) => {
    try {
      await updateDoc(doc(db, "contributions", c.id), { adminId: newAdminId });
      toast.success(t("common.success"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t("superAdmin.contributions")}</h1>
        <span className="text-sm text-muted-foreground">
          {t("superAdmin.pendingAcrossAll")}: <span className="font-semibold text-foreground">{pendingCount}</span>
        </span>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.status")} — All</SelectItem>
              <SelectItem value="pending">{t("status.pending")}</SelectItem>
              <SelectItem value="approved">{t("status.approved")}</SelectItem>
              <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
              <SelectItem value="late">{t("status.late")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger><SelectValue placeholder={t("common.month")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger><SelectValue placeholder={t("common.admin")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All admins</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-10 flex flex-col items-center text-center gap-3 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10" />
            <p>{t("admin.noPending")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => {
            const u = usersById[c.userId] ?? userMap[c.userId];
            const a = c.adminId ? usersById[c.adminId] : null;
            return (
              <Card key={c.id} className="shadow-soft overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{u?.fullName ?? "…"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.monthId} · {c.amount} ETB · {a?.fullName ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.late && <StatusBadge status="late" />}
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                  {c.screenshotUrl && (
                    <button onClick={() => setPreviewUrl(c.screenshotUrl)} className="block w-full">
                      <img src={c.screenshotUrl} alt="proof" className="w-full h-40 object-cover rounded-lg border border-border" />
                    </button>
                  )}
                  {c.rejectionReason && (
                    <p className="text-xs text-destructive">{t("student.rejectionReason")}: {c.rejectionReason}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={c.adminId ?? ""}
                      onValueChange={(v) => reassignContribution(c, v)}
                    >
                      <SelectTrigger className="w-full sm:w-44 h-8 text-xs">
                        <SelectValue placeholder={t("superAdmin.reassignAdmin")} />
                      </SelectTrigger>
                      <SelectContent>
                        {admins
                          .filter((ad) => !u || ad.gender === u.gender)
                          .map((ad) => (
                            <SelectItem key={ad.id} value={ad.id}>{ad.fullName}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {c.status !== "approved" && (
                      <Button onClick={() => approve(c)} disabled={busy} size="sm" className="bg-success hover:bg-success/90 text-success-foreground">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {t("admin.approve")}
                      </Button>
                    )}
                    {c.status !== "rejected" && (
                      <Button onClick={() => setRejectFor(c)} disabled={busy} size="sm" variant="destructive">
                        <X className="h-4 w-4 mr-1" />
                        {t("admin.reject")}
                      </Button>
                    )}
                    {c.screenshotUrl && (
                      <Button variant="outline" size="sm" onClick={() => setPreviewUrl(c.screenshotUrl)}>
                        <ImageIcon className="h-4 w-4 mr-1" />
                        {t("admin.viewScreenshot")}
                      </Button>
                    )}
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
