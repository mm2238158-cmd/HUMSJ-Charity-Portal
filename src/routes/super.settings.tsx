import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSettings, useMonths } from "@/lib/data-hooks";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsPage } from "@/components/settings-page";
import { toast } from "sonner";
import { doc, setDoc, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { seedDemoData } from "@/lib/seed";
import { ensureCurrentMonth, type DeadlineDay } from "@/lib/months";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/super/settings")({
  component: SuperSettings,
});

function SuperSettings() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { months } = useMonths();
  const [amount, setAmount] = useState(50);
  const [days, setDays] = useState(3);
  const [allowLate, setAllowLate] = useState(true);
  const [deadlineDay, setDeadlineDay] = useState<DeadlineDay>(28);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [rolling, setRolling] = useState(false);

  // new month form
  const [mName, setMName] = useState("");
  const [mStart, setMStart] = useState("");
  const [mDue, setMDue] = useState("");

  useEffect(() => {
    if (settings) {
      setAmount(settings.contributionAmount);
      setDays(settings.reminderDaysBefore);
      setAllowLate(settings.allowLatePayment);
      setDeadlineDay((settings.collectionDeadlineDay as DeadlineDay) ?? 28);
    }
  }, [settings]);

  const saveSettings = async () => {
    setBusy(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        contributionAmount: amount,
        reminderDaysBefore: days,
        allowLatePayment: allowLate,
        collectionDeadlineDay: deadlineDay,
      });
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runRollover = async () => {
    setRolling(true);
    try {
      await ensureCurrentMonth(deadlineDay);
      toast.success(t("superAdmin.rolledOver"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRolling(false);
    }
  };

  const createMonth = async () => {
    if (!mName || !mStart || !mDue) return toast.error(t("common.error"));
    const start = new Date(mStart);
    const id = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    try {
      await setDoc(doc(db, "months", id), {
        name: mName,
        startDate: Timestamp.fromDate(start),
        dueDate: Timestamp.fromDate(new Date(mDue)),
        isActive: false,
      });
      toast.success(t("common.success"));
      setMName(""); setMStart(""); setMDue("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const setActive = async (id: string) => {
    const batch = writeBatch(db);
    months.forEach((m) => batch.update(doc(db, "months", m.id), { isActive: m.id === id }));
    await batch.commit();
    toast.success(t("common.success"));
  };

  const seed = async () => {
    if (!confirm(t("superAdmin.seedConfirm"))) return;
    setSeeding(true);
    try {
      await seedDemoData();
      toast.success(t("superAdmin.seeded"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card className="shadow-soft">
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">Global settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{t("superAdmin.contributionAmount")}</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>{t("superAdmin.reminderDays")}</Label>
              <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>{t("superAdmin.allowLate")}</Label>
              <div className="flex h-9 items-center"><Switch checked={allowLate} onCheckedChange={setAllowLate} /></div>
            </div>
          </div>
          <Button onClick={saveSettings} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("settings.save")}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">{t("superAdmin.months")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2"><Label>{t("superAdmin.monthName")}</Label><Input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="April 2026" /></div>
            <div className="space-y-2"><Label>{t("superAdmin.startDate")}</Label><Input type="date" value={mStart} onChange={(e) => setMStart(e.target.value)} /></div>
            <div className="space-y-2"><Label>{t("superAdmin.dueDate")}</Label><Input type="date" value={mDue} onChange={(e) => setMDue(e.target.value)} /></div>
          </div>
          <Button onClick={createMonth}>{t("superAdmin.createMonth")}</Button>
          <div className="space-y-2 pt-2">
            {months.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.id}</p>
                </div>
                {m.isActive ? (
                  <span className="text-xs font-semibold text-success">{t("status.active")}</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setActive(m.id)}>{t("superAdmin.setActive")}</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardContent className="p-5">
          <h2 className="font-semibold">Demo data</h2>
          <p className="text-sm text-muted-foreground mt-1">Populate Firestore with mock users, months and contributions.</p>
          <Button className="mt-3" variant="outline" onClick={seed} disabled={seeding}>
            {seeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("superAdmin.seedData")}
          </Button>
        </CardContent>
      </Card>

      <SettingsPage />
    </div>
  );
}
