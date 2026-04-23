import { Link, useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  notificationsHref: string;
}

export function AppHeader({ notificationsHref }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("isRead", "==", false),
    );
    const unsub = onSnapshot(q, (snap) => setUnread(snap.size), () => setUnread(0));
    return unsub;
  }, [user]);

  const initial = profile?.fullName?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 backdrop-blur px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <img src="/humsj-icon-192.png" alt="HUMSJ" className="h-8 w-8 rounded-lg" />
        <span className="font-bold text-sm">HUMSJ</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Link to={notificationsHref}>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        </Link>
        <button
          onClick={() => {
            const settingsRoute =
              profile?.role === "super-admin"
                ? "/super/settings"
                : profile?.role === "admin"
                  ? "/admin/settings"
                  : "/app/settings";
            navigate({ to: settingsRoute });
          }}
          aria-label="Profile"
        >
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            {profile?.photoURL ? <AvatarImage src={profile.photoURL} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}
