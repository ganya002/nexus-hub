"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getNotifications, markRead, markAllRead } from "@/lib/notifications";
import Link from "next/link";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getNotifications(user.uid).then(setNotifs);
  }, [user]);

  async function handleMarkAll() {
    if (!user) return;
    await markAllRead(user.uid);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function handleClick(n) {
    if (!user) return;
    if (!n.read) {
      await markRead(user.uid, n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
  }

  if (loading || !user) return null;

  const unread = notifs.filter(n => !n.read).length;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28 }}>
          notifications
        </h1>
        {unread > 0 && (
          <button onClick={handleMarkAll} style={{
            fontSize: 11, color: "var(--muted)", cursor: "pointer",
            background: "none", border: "none", fontFamily: "var(--mono)",
          }}>
            mark all read
          </button>
        )}
      </div>

      {notifs.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
          no notifications yet
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
        {notifs.map(n => {
          const inner = (
            <div style={{
              padding: "14px 16px", background: n.read ? "var(--bg)" : "var(--bg2)",
              display: "flex", gap: 12, alignItems: "flex-start",
              cursor: "pointer",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: n.read ? "transparent" : "var(--accent)",
                marginTop: 3, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 2, fontWeight: n.read ? 400 : 500 }}>
                  {n.title}
                </p>
                <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{n.body}</p>
              </div>
            </div>
          );

          const content = n.link ? (
            <Link href={n.link} onClick={() => handleClick(n)} style={{ textDecoration: "none", display: "block" }}>
              {inner}
            </Link>
          ) : (
            <div onClick={() => handleClick(n)}>{inner}</div>
          );

          return <div key={n.id}>{content}</div>;
        })}
      </div>
    </main>
  );
}
