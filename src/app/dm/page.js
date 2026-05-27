"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getUserDMs, getProfilesBatch, searchUsers } from "@/lib/dms";
import Link from "next/link";

export default function DmPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;
    getUserDMs(user.uid).then(async (dms) => {
      setConversations(dms);
      const otherUids = dms.map(d => d.participants?.find(p => p !== user.uid)).filter(Boolean);
      if (otherUids.length > 0) {
        const ps = await getProfilesBatch(otherUids);
        setProfiles(Object.fromEntries(ps.map(p => [p.uid, p])));
      }
    });
  }, [user]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const r = await searchUsers(search);
      setResults(r.filter(u => u.uid !== user?.uid));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user]);

  if (loading || !user) return null;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28 }}>
          dms
        </h1>
        <button onClick={() => setShowNew(!showNew)} style={{
          fontSize: 12, padding: "5px 10px", border: "1px solid var(--border)",
          color: "var(--muted)", cursor: "pointer", background: "none",
          fontFamily: "var(--mono)", transition: "color 0.2s, border-color 0.2s",
        }}>
          {showNew ? "cancel" : "+ new dm"}
        </button>
      </div>

      {showNew && (
        <div style={{ marginBottom: 24, padding: 16, border: "1px solid var(--border)", background: "var(--bg2)" }}>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em" }}>
            {'// search users'}
          </p>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="name or @username..."
            autoFocus
            style={{
              width: "100%", background: "var(--bg3)", border: "1px solid var(--border)",
              color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)",
              fontSize: 12, outline: "none", marginBottom: 8,
            }}
          />
          {results.length === 0 && search.trim() && (
            <p style={{ fontSize: 11, color: "var(--muted2)", padding: 8 }}>no users found</p>
          )}
          {results.map(u => (
            <div key={u.uid} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <span style={{ fontSize: 13, color: "var(--text)", display: "block" }}>{u.displayName}</span>
                {u.username && <span style={{ fontSize: 10, color: "var(--muted2)" }}>@{u.username}</span>}
              </div>
              <Link href={`/dm/${u.uid}`} style={{
                fontSize: 11, padding: "4px 8px", border: "1px solid var(--border)",
                color: "var(--muted)", textDecoration: "none", fontFamily: "var(--mono)",
              }}>
                message
              </Link>
            </div>
          ))}
        </div>
      )}

      {conversations.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--muted2)", padding: 40, textAlign: "center" }}>
          no conversations yet — start one by searching for someone
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
        {conversations.map(dm => {
          const otherUid = dm.participants?.find(p => p !== user.uid);
          const other = profiles[otherUid];
          return (
            <Link key={dm.id} href={`/dm/${otherUid}`} style={{
              background: "var(--bg)", padding: "16px 20px", textDecoration: "none",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              transition: "background 0.2s",
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{
                    width: 20, height: 20, minWidth: 20,
                    border: "1px solid var(--border)", background: "var(--bg3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, color: "var(--text)",
                  }}>
                    {other?.displayName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>
                    {other?.displayName || "unknown"}
                  </span>
                </div>
                {dm.lastMessage && (
                  <p style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {dm.lastMessage}
                  </p>
                )}
              </div>
              {dm.lastMessageAt && (
                <span style={{ fontSize: 9, color: "var(--muted2)", whiteSpace: "nowrap", marginLeft: 12 }}>
                  {dm.lastMessageAt?.toDate?.()?.toLocaleDateString?.() || ""}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
