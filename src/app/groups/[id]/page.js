"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getGroup, getMembers } from "@/lib/firebase";
import { getChannels, createChannel } from "@/lib/chat";
import InviteControls from "@/components/InviteControls";
import Link from "next/link";

export default function GroupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    getGroup(id).then(g => { if (!g) router.push("/groups"); else setGroup(g); });
    getMembers(id).then(setMembers);
    getChannels(id).then(c => {
      if (c.length === 0) {
        createChannel(id, "general").then(() => getChannels(id).then(setChannels));
      } else {
        setChannels(c);
      }
    });
  }, [id, router]);

  async function handleCreateChannel() {
    if (!newChannelName.trim()) return;
    const channelId = await createChannel(id, newChannelName.trim());
    setNewChannelName("");
    setShowNewChannel(false);
    router.push(`/groups/${id}/chat/${channelId}`);
  }

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

      {/* channels */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {'// channels'}
          </p>
          <button onClick={() => setShowNewChannel(!showNewChannel)} style={{
            fontSize: 11, color: "var(--muted)", cursor: "pointer",
            background: "none", border: "none", fontFamily: "var(--mono)",
          }}>
            + new
          </button>
        </div>

        {showNewChannel && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="text" value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
              placeholder="channel name" autoFocus
              onKeyDown={e => e.key === "Enter" && handleCreateChannel()}
              style={{
                flex: 1, background: "var(--bg3)", border: "1px solid var(--border)",
                color: "var(--text)", padding: "6px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none",
              }}
            />
            <button onClick={handleCreateChannel} style={{
              fontSize: 11, padding: "6px 10px", border: "1px solid var(--border)",
              color: "var(--text)", cursor: "pointer", background: "var(--bg3)", fontFamily: "var(--mono)",
            }}>
              create
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {channels.map(ch => (
            <Link key={ch.id} href={`/groups/${id}/chat/${ch.id}`} style={{
              padding: "10px 12px", background: "var(--bg2)", border: "1px solid var(--border)",
              textDecoration: "none", display: "flex", justifyContent: "space-between",
              fontSize: 13, color: "var(--text)",
            }}>
              <span># {ch.name}</span>
              <span style={{ fontSize: 10, color: "var(--muted2)" }}>→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* members */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {'// members'}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
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
      </div>

      {/* invite */}
      <div style={{ padding: 20, border: "1px solid var(--border)", background: "var(--bg2)" }}>
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em" }}>
          {'// invite'}
        </p>
        <InviteControls groupId={id} />
      </div>
    </div>
  );
}
