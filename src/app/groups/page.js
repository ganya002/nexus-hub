"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getGroupsByCategory } from "@/lib/firebase";
import Link from "next/link";

export default function GroupsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("discover");
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  useEffect(() => {
    getGroupsByCategory().then(setGroups);
  }, []);

  if (loading || !user) return null;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28 }}>
          groups
        </h1>
        <Link href="/groups/create" style={{
          fontSize: 12, padding: "5px 10px", border: "1px solid var(--border)",
          color: "var(--muted)", textDecoration: "none", fontFamily: "var(--mono)",
        }}>
          + new group
        </Link>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
        <button onClick={() => setTab("discover")} style={{
          fontSize: 12, padding: "8px 0", marginRight: 20,
          background: "none", border: "none", fontFamily: "var(--mono)", cursor: "pointer",
          color: tab === "discover" ? "var(--text)" : "var(--muted2)",
          borderBottom: tab === "discover" ? "1px solid var(--accent)" : "1px solid transparent",
          marginBottom: -1,
        }}>
          discover
        </button>
        <button onClick={() => setTab("yours")} style={{
          fontSize: 12, padding: "8px 0", marginRight: 20,
          background: "none", border: "none", fontFamily: "var(--mono)", cursor: "pointer",
          color: tab === "yours" ? "var(--text)" : "var(--muted2)",
          borderBottom: tab === "yours" ? "1px solid var(--accent)" : "1px solid transparent",
          marginBottom: -1,
        }}>
          your groups
        </button>
      </div>

      {tab === "discover" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
          {groups.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted2)", padding: 40, textAlign: "center" }}>
              no public groups yet
            </p>
          )}
          {groups.map(g => (
            <Link key={g.id} href={`/groups/${g.id}`} style={{
              background: "var(--bg)", padding: 20, textDecoration: "none",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <span style={{ fontSize: 14, color: "var(--text)", display: "block", marginBottom: 4 }}>{g.name}</span>
                <span style={{ fontSize: 11, color: "var(--muted2)" }}>{g.description}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, color: "var(--muted2)" }}>{g.memberCount} {g.memberCount === 1 ? "member" : "members"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "yours" && (
        <p style={{ fontSize: 12, color: "var(--muted2)", padding: 40, textAlign: "center" }}>
          your groups will show here — join some or create one
        </p>
      )}
    </main>
  );
}
