"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { reserveUsername, updateUserProfile } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function SetupUsernamePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && profile?.username) router.push("/home");
  }, [user, profile, loading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleaned || cleaned.length < 2) {
      setError("username must be at least 2 characters (letters, numbers, underscores)");
      return;
    }
    setSubmitting(true);
    try {
      await reserveUsername(cleaned, user.uid);
      await updateUserProfile(user.uid, { username: cleaned });
      router.push("/home");
    } catch (err) {
      setError(err.message === "username taken" ? "that username's taken" : err.message);
    }
    setSubmitting(false);
  }

  if (loading || profile?.username) return null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 48, marginBottom: 12 }}>
        pick a username
      </h1>
      <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 32 }}>
        this is your @handle — used for invites and DMs
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>username</label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); }}
            placeholder="letters, numbers, underscores"
            autoFocus
            style={{
              background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)",
              padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 13, outline: "none",
            }}
          />
        </div>

        {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{
          background: "var(--accent)", color: "#0f0f0c", border: "none",
          padding: 11, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
          cursor: "pointer", opacity: submitting ? 0.5 : 1,
        }}>
          {submitting ? "..." : "set username →"}
        </button>
      </form>
    </main>
  );
}
