import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { toast } from "sonner";
import { LogOut, Loader2, Camera } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Language, ThemePref } from "@/lib/types";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(profile?.fullName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [notifEnabled, setNotifEnabled] = useState(profile?.notificationsEnabled ?? true);

  if (!user || !profile) return null;

  const ETHIOPIAN_PHONE = /^\+251(7|9)\d{8}$/;

  const save = async () => {
    if (phone && !ETHIOPIAN_PHONE.test(phone.trim())) {
      toast.error(t("auth.phoneFormat"));
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        fullName: name,
        phone: phone.trim(),
        notificationsEnabled: notifEnabled,
      });
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("settings.avatarTooLarge"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(t("common.error"));
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `avatars/${user.uid}/avatar.${ext}`;
      const sRef = ref(storage, path);
      await uploadBytes(sRef, file, { contentType: file.type });
      const url = await getDownloadURL(sRef);
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      toast.success(t("settings.saved"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onLanguage = async (v: string) => {
    const lang = v as Language;
    await i18n.changeLanguage(lang);
    await updateDoc(doc(db, "users", user.uid), { language: lang });
  };

  const onTheme = async (v: string) => {
    const th = v as ThemePref;
    setTheme(th);
    await updateDoc(doc(db, "users", user.uid), { theme: th });
  };

  const onLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card className="shadow-soft">
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">{t("settings.profile")}</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-primary/30">
                {profile.photoURL ? <AvatarImage src={profile.photoURL} /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {profile.fullName?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer shadow-soft">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
            </div>
            <div>
              <p className="font-semibold">{profile.fullName}</p>
              <p className="text-xs text-muted-foreground capitalize">{t(`common.${profile.role === "super-admin" ? "superAdmin" : profile.role}`)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("auth.fullName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("auth.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("auth.gender")}</Label>
              <Input value={profile.gender} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t("common.role")}</Label>
              <Input value={profile.role} disabled />
            </div>
          </div>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("settings.save")}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">{t("settings.language")}</h2>
          <Select value={i18n.language} onValueChange={onLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="am">አማርኛ</SelectItem>
              <SelectItem value="om">Afaan Oromo</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">{t("settings.theme")}</h2>
          <Select value={theme} onValueChange={onTheme}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t("settings.light")}</SelectItem>
              <SelectItem value="dark">{t("settings.dark")}</SelectItem>
              <SelectItem value="system">{t("settings.system")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{t("settings.notifications")}</h2>
              <p className="text-xs text-muted-foreground">{t("settings.enableReminders")}</p>
            </div>
            <Switch
              checked={notifEnabled}
              onCheckedChange={(v) => {
                setNotifEnabled(v);
                void updateDoc(doc(db, "users", user.uid), { notificationsEnabled: v });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={onLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        {t("auth.signOut")}
      </Button>
    </div>
  );
}
