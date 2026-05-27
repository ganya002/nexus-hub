"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { subscribeNotifications } from "@/lib/notifications";

const TABS = [
  { href: "/home", label: "home" },
  { href: "/notifications", label: "notifs" },
  { href: "/dm", label: "dms" },
  { href: "/groups", label: "groups" },
  { href: "/profile", label: "profile" },
];

export default function BottomNav() {
  const { user, loading } = useAuth();
  const path = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeNotifications(user.uid, (list) => {
      setUnread(list.filter(n => !n.read).length);
    });
    return unsub;
  }, [user]);

  if (loading || !user) return null;

  const hideOn = ["/verify", "/setup-username"];
  if (hideOn.includes(path)) return null;

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--bg2)", borderTop: "1px solid var(--border)",
      display: "flex", justifyContent: "space-around",
      padding: "8px 0", zIndex: 50,
    }}>
      {TABS.map(t => {
        const active = path.startsWith(t.href);
        const isNotifs = t.href === "/notifications";
        return (
          <Link key={t.href} href={t.href} style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
            color: active ? "var(--accent)" : "var(--muted2)",
            textDecoration: "none", padding: "4px 8px",
            position: "relative", transition: "color 0.2s",
          }}>
            {t.label}
            {isNotifs && unread > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2,
                background: "var(--accent)", color: "#0f0f0c",
                fontSize: 9, fontWeight: 600,
                minWidth: 16, height: 14, borderRadius: 7,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px", lineHeight: 1,
              }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
