"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getGroupsByCategory } from "@/lib/firebase";
import Link from "next/link";

const CATEGORIES = ["gaming", "music", "art", "tech", "study", "sports", "other"];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [category, setCategory] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  useEffect(() => {
    getGroupsByCategory(category).then(setGroups);
  }, [category]);

  if (loading || !user) return null;

  const filtered = groups.filter(g =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 24 }}>
        discover
      </h1>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="search groups..."
        style={{
          width: "100%", background: "var(--bg3)", border: "1px solid var(--border)",
          color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)",
          fontSize: 13, outline: "none", marginBottom: 20,
        }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
        <button onClick={() => setCategory(null)} style={{
          fontSize: 11, padding: "4px 10px", border: "1px solid var(--border)",
          background: category === null ? "var(--border)" : "none",
          color: category === null ? "var(--text)" : "var(--muted)",
          cursor: "pointer", fontFamily: "var(--mono)",
        }}>
          trending
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            fontSize: 11, padding: "4px 10px", border: "1px solid var(--border)",
            background: category === c ? "var(--border)" : "none",
            color: category === c ? "var(--text)" : "var(--muted)",
            cursor: "pointer", fontFamily: "var(--mono)",
          }}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--muted2)", padding: 40, textAlign: "center" }}>
          {search ? "no groups match that search" : "no groups yet — be the first to create one"}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
        {filtered.map(g => (
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
              <span style={{ fontSize: 10, color: "var(--muted)", display: "block" }}>{g.category}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
