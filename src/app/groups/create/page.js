"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { createGroup, addMember } from "@/lib/firebase";

const CATEGORIES = ["gaming", "music", "art", "tech", "study", "sports", "other"];

export default function CreateGroupPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("other");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("group needs a name"); return; }
    setSubmitting(true);
    try {
      const groupId = await createGroup({
        name: name.trim(),
        description: desc.trim(),
        category,
        createdBy: user.uid,
      });
      await addMember(groupId, user.uid, user.displayName || "unknown", "owner");
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  if (loading || !user) return null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 24 }}>
        create a group
      </h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>name</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="your group's name" autoFocus
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>description</label>
          <input
            type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="what's your group about?"
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>category</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCategory(c)} style={{
                fontSize: 11, padding: "4px 10px", border: "1px solid var(--border)",
                background: category === c ? "var(--border)" : "none",
                color: category === c ? "var(--text)" : "var(--muted)",
                cursor: "pointer", fontFamily: "var(--mono)",
              }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{
          background: "var(--accent)", color: "#0f0f0c", border: "none",
          padding: 11, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
          cursor: "pointer", opacity: submitting ? 0.5 : 1, marginTop: 4,
        }}>
          {submitting ? "..." : "create group →"}
        </button>
      </form>
    </main>
  );
}
