"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { href: "/chat", label: "chat" },
  { href: "/links", label: "links" },
  { href: "/voice", label: "voice" },
  { href: "/todos", label: "todos" },
  { href: "/gallery", label: "gallery" },
];

export default function GroupSubNav({ groupId }) {
  const path = usePathname();

  return (
    <nav style={{
      display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24,
      overflowX: "auto", whiteSpace: "nowrap", WebkitOverflowScrolling: "touch",
    }}>
      {TABS.map(t => {
        const full = `/groups/${groupId}${t.href}`;
        const active = path === full;
        return (
          <Link key={t.href} href={full} style={{
            fontSize: 12, padding: "8px 0", marginRight: 20,
            color: active ? "var(--text)" : "var(--muted2)",
            borderBottom: active ? "1px solid var(--accent)" : "1px solid transparent",
            marginBottom: -1, textDecoration: "none", fontFamily: "var(--mono)",
          }}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
