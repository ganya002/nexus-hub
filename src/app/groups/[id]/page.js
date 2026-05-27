"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getGroup, getMembers } from "@/lib/firebase";
import InviteControls from "@/components/InviteControls";

export default function GroupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    getGroup(id).then(g => { if (!g) router.push("/groups"); else setGroup(g); });
    getMembers(id).then(setMembers);
  }, [id, router]);

  if (loading || !user || !group) return null;

  return (
    <div>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 8 }}>
        {group.name}
      </h1>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{group.description}</p>
      <p style={{ fontSize: 10, color: "var(--muted2)", marginBottom: 24 }}>
        {members.length} {members.length === 1 ? "member" : "members"}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
        {members.map(m => (
          <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid var(--border)", background: "var(--bg2)" }}>
            <div style={{
              width: 24, height: 24, border: "1px solid var(--border)", background: "var(--bg3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, color: "var(--text)", letterSpacing: "0.04em",
            }}>
              {m.displayName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{m.displayName}</span>
          </div>
        ))}
      </div>

      {/* invite section */}
      <div style={{ marginTop: 32, padding: 20, border: "1px solid var(--border)", background: "var(--bg2)" }}>
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em" }}>
          {'// invite'}
        </p>
        <InviteControls groupId={id} />
      </div>
    </div>
  );
}
