"use client";
import { useState } from "react";
import { createInvite } from "@/lib/firebase";

const DURATIONS = [
  { label: "24h", value: 86400000 },
  { label: "7d", value: 604800000 },
  { label: "30d", value: 2592000000 },
  { label: "never", value: 0 },
];

export default function InviteControls({ groupId }) {
  const [code, setCode] = useState(null);
  const [duration, setDuration] = useState(86400000);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const expiresAt = duration === 0 ? null : new Date(Date.now() + duration);
    const c = await createInvite(groupId, "owner", expiresAt);
    setCode(c);
    setLoading(false);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {DURATIONS.map(d => (
          <button key={d.value} onClick={() => setDuration(d.value)} style={{
            fontSize: 11, padding: "4px 10px", border: "1px solid var(--border)",
            background: duration === d.value ? "var(--border)" : "none",
            color: duration === d.value ? "var(--text)" : "var(--muted)",
            cursor: "pointer", fontFamily: "var(--mono)",
          }}>
            {d.label}
          </button>
        ))}
      </div>
      <button onClick={generate} disabled={loading} style={{
        fontSize: 12, padding: "5px 10px", border: "1px solid var(--border)",
        color: "var(--muted)", cursor: "pointer", background: "none",
        fontFamily: "var(--mono)", opacity: loading ? 0.5 : 1,
      }}>
        {loading ? "..." : "generate invite link"}
      </button>
      {code && (
        <div style={{ marginTop: 12, padding: "8px 10px", background: "var(--bg3)", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>share this link:</p>
          <p style={{ fontSize: 12, color: "var(--accent)", wordBreak: "break-all" }}>
            {typeof window !== "undefined" ? window.location.origin : ""}/join/{code}
          </p>
        </div>
      )}
    </div>
  );
}
