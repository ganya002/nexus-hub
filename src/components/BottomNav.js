"use client";
import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { href: "/home", label: "home" },
  { href: "/dm", label: "dms" },
  { href: "/groups", label: "groups" },
  { href: "/profile", label: "profile" },
];

export default function BottomNav() {
  const { user, loading } = useAuth();
  const path = usePathname();

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
        return (
          <Link key={t.href} href={t.href} style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
            color: active ? "var(--accent)" : "var(--muted2)",
            textDecoration: "none", padding: "4px 8px",
            transition: "color 0.2s",
          }}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
