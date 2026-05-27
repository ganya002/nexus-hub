"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { updateUserProfile, logOut } from "@/lib/firebase";

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName);
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim() });
      await refreshProfile();
    } catch {}
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || !user) return null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 24 }}>
        profile
      </h1>

      <div style={{ marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, border: "1px solid var(--border)", background: "var(--bg3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, color: "var(--text)", letterSpacing: "0.04em", marginBottom: 12,
        }}>
          {profile?.displayName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted2)" }}>
          @{profile?.username || "..."}
        </p>
        <p style={{ fontSize: 11, color: "var(--muted2)", marginTop: 4 }}>
          {user.email}
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>display name</label>
          <input
            type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
          />
        </div>
        <button type="submit" disabled={saving} style={{
          background: "var(--accent)", color: "#0f0f0c", border: "none",
          padding: 11, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
          cursor: "pointer", opacity: saving ? 0.5 : 1,
        }}>
          {saving ? "..." : saved ? "saved!" : "save"}
        </button>
      </form>

      <button onClick={logOut} style={{
        fontSize: 12, color: "var(--danger)", cursor: "pointer",
        background: "none", border: "1px solid var(--danger)", fontFamily: "var(--mono)",
        padding: "8px 16px",
      }}>
        sign out
      </button>
    </main>
  );
}
