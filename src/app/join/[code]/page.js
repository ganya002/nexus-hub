"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getInvite, useInvite as consumeInvite, getGroup, addMember, getUserProfile } from "@/lib/firebase";

export default function JoinPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { code } = useParams();
  const [invite, setInvite] = useState(null);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    getInvite(code).then(async (inv) => {
      if (!inv) { setError("invite not found"); return; }
      if (inv.expiresAt?.toMillis?.() < Date.now()) { setError("this invite has expired"); return; }
      setInvite(inv);
      const g = await getGroup(inv.groupId);
      if (!g) { setError("group not found"); return; }
      setGroup(g);
    });
  }, [code]);

  async function handleJoin() {
    if (!user || !invite || joined) return;
    try {
      await consumeInvite(code);
      const profile = await getUserProfile(user.uid);
      await addMember(invite.groupId, user.uid, profile?.displayName || user.displayName || "unknown");
      setJoined(true);
      setTimeout(() => router.push(`/groups/${invite.groupId}`), 1000);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      {loading && <p style={{ fontSize: 12, color: "var(--muted2)" }}>loading...</p>}

      {error && (
        <div>
          <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 36, marginBottom: 12 }}>
            oops
          </h1>
          <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 24 }}>{error}</p>
        </div>
      )}

      {group && !error && (
        <div>
          <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 36, marginBottom: 8 }}>
            {group.name}
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{group.description}</p>
          <p style={{ fontSize: 10, color: "var(--muted2)", marginBottom: 32 }}>
            {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
          </p>

          {!user ? (
            <p style={{ fontSize: 12, color: "var(--muted2)" }}>
              log in to join this group
            </p>
          ) : joined ? (
            <p style={{ fontSize: 12, color: "var(--accent)" }}>joined! redirecting...</p>
          ) : (
            <button onClick={handleJoin} style={{
              background: "var(--accent)", color: "#0f0f0c", border: "none",
              padding: "10px 24px", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
              cursor: "pointer",
            }}>
              join group →
            </button>
          )}
        </div>
      )}
    </main>
  );
}
