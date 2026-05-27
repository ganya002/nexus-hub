"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getGroup, getMembers, updateMemberRole, updateGroup, deleteGroup } from "@/lib/firebase";
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
  const [newChannelType, setNewChannelType] = useState("text");
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    getGroup(id).then(g => { if (!g) router.push("/groups"); else { setGroup(g); setEditName(g.name); setEditDesc(g.description || ""); } });
    getMembers(id).then(setMembers);
    getChannels(id).then(c => {
      if (c.length === 0) {
        createChannel(id, "general").then(() => getChannels(id).then(setChannels));
      } else {
        setChannels(c);
      }
    });
  }, [id, router]);

  const myMember = members.find(m => m.uid === user?.uid);
  const isOwner = myMember?.role === "owner";
  const isAdmin = myMember?.role === "admin" || isOwner;

  async function handleCreateChannel() {
    if (!newChannelName.trim()) return;
    const channelId = await createChannel(id, newChannelName.trim(), newChannelType);
    setNewChannelName("");
    setNewChannelType("text");
    setShowNewChannel(false);
    if (newChannelType === "voice") {
      router.push(`/groups/${id}/voice`);
    } else {
      router.push(`/groups/${id}/chat/${channelId}`);
    }
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    await updateGroup(id, { name: editName.trim(), description: editDesc.trim() });
    setGroup(g => ({ ...g, name: editName.trim(), description: editDesc.trim() }));
    setShowEdit(false);
  }

  async function handleDelete() {
    await deleteGroup(id);
    router.push("/groups");
  }

  async function handlePromote(uid) {
    await updateMemberRole(id, uid, "admin");
    setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role: "admin" } : m));
  }

  async function handleDemote(uid) {
    await updateMemberRole(id, uid, "member");
    setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role: "member" } : m));
  }

  async function handleRemoveMember(uid) {
    if (uid === user.uid) return;
    await removeMember(id, uid);
    setMembers(prev => prev.filter(m => m.uid !== uid));
  }

  if (loading || !user || !group) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 4 }}>
            {group.name}
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{group.description}</p>
          <p style={{ fontSize: 10, color: "var(--muted2)" }}>
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowEdit(!showEdit)} style={{
            fontSize: 11, color: "var(--muted)", cursor: "pointer",
            background: "none", border: "none", fontFamily: "var(--mono)",
          }}>
            {showEdit ? "cancel" : "settings"}
          </button>
        )}
      </div>

      {/* edit group */}
      {showEdit && (
        <div style={{ padding: 16, border: "1px solid var(--border)", background: "var(--bg2)", marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em" }}>
            {'// edit group'}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
              placeholder="group name" autoFocus
              style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
            />
            <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
              placeholder="description"
              style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSaveEdit} style={{
                fontSize: 11, padding: "6px 10px", border: "1px solid var(--border)",
                color: "var(--text)", cursor: "pointer", background: "var(--bg3)", fontFamily: "var(--mono)",
              }}>
                save
              </button>
              <button onClick={() => setConfirmDelete(!confirmDelete)} style={{
                fontSize: 11, padding: "6px 10px", border: "1px solid var(--danger)",
                color: "var(--danger)", cursor: "pointer", background: "none", fontFamily: "var(--mono)",
              }}>
                delete group
              </button>
            </div>
            {confirmDelete && (
              <div style={{ marginTop: 8, padding: 12, border: "1px solid var(--danger)", background: "var(--bg)" }}>
                <p style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>delete this group and all its data? this cannot be undone.</p>
                <button onClick={handleDelete} style={{
                  fontSize: 11, padding: "6px 10px", border: "none",
                  color: "#0f0f0c", cursor: "pointer", background: "var(--danger)", fontFamily: "var(--mono)",
                }}>
                  confirm delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 16 }}>{error}</p>}

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
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <input
              type="text" value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
              placeholder="channel name" autoFocus
              onKeyDown={e => e.key === "Enter" && handleCreateChannel()}
              style={{
                width: "100%", background: "var(--bg3)", border: "1px solid var(--border)",
                color: "var(--text)", padding: "6px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => setNewChannelType("text")} style={{
                  fontSize: 10, padding: "4px 8px", border: "1px solid var(--border)",
                  background: newChannelType === "text" ? "var(--border)" : "none",
                  color: newChannelType === "text" ? "var(--text)" : "var(--muted)",
                  cursor: "pointer", fontFamily: "var(--mono)",
                }}>
                  text
                </button>
                <button type="button" onClick={() => setNewChannelType("voice")} style={{
                  fontSize: 10, padding: "4px 8px", border: "1px solid var(--border)",
                  background: newChannelType === "voice" ? "var(--border)" : "none",
                  color: newChannelType === "voice" ? "var(--text)" : "var(--muted)",
                  cursor: "pointer", fontFamily: "var(--mono)",
                }}>
                  voice
                </button>
              </div>
              <button onClick={handleCreateChannel} style={{
                fontSize: 11, padding: "6px 10px", border: "1px solid var(--border)",
                color: "var(--text)", cursor: "pointer", background: "var(--bg3)", fontFamily: "var(--mono)",
                marginLeft: "auto",
              }}>
                create
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {channels.map(ch => {
            const isVoice = ch.type === "voice";
            const href = isVoice ? `/groups/${id}/voice` : `/groups/${id}/chat/${ch.id}`;
            return (
              <Link key={ch.id} href={href} style={{
                padding: "10px 12px", background: "var(--bg2)", border: "1px solid var(--border)",
                textDecoration: "none", display: "flex", justifyContent: "space-between",
                fontSize: 13, color: "var(--text)",
              }}>
                <span>{isVoice ? "♪" : "#"} {ch.name}</span>
                <span style={{ fontSize: 10, color: "var(--muted2)" }}>{isVoice ? "voice" : "→"}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* members */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {'// members'}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
          {members.map(m => {
            const isMe = m.uid === user.uid;
            return (
              <div key={m.uid} style={{
                padding: "8px 10px", background: "var(--bg)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{
                  width: 24, height: 24, border: "1px solid var(--border)", background: "var(--bg3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "var(--text)", letterSpacing: "0.04em", flexShrink: 0,
                }}>
                  {m.displayName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: "var(--text)" }}>
                    {m.displayName}{isMe ? " (you)" : ""}
                  </span>
                  {m.role !== "member" && (
                    <span style={{ fontSize: 9, color: "var(--accent)", marginLeft: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {m.role}
                    </span>
                  )}
                </div>
                {isAdmin && !isMe && (
                  <div style={{ display: "flex", gap: 4 }}>
                    {isOwner && m.role === "member" && (
                      <button onClick={() => handlePromote(m.uid)} style={{
                        fontSize: 9, padding: "2px 6px", border: "1px solid var(--border)",
                        color: "var(--muted)", cursor: "pointer", background: "none", fontFamily: "var(--mono)",
                      }}>
                        promote
                      </button>
                    )}
                    {isOwner && m.role === "admin" && (
                      <button onClick={() => handleDemote(m.uid)} style={{
                        fontSize: 9, padding: "2px 6px", border: "1px solid var(--border)",
                        color: "var(--muted)", cursor: "pointer", background: "none", fontFamily: "var(--mono)",
                      }}>
                        demote
                      </button>
                    )}
                    <button onClick={() => handleRemoveMember(m.uid)} style={{
                      fontSize: 9, padding: "2px 6px", border: "1px solid var(--danger)",
                      color: "var(--danger)", cursor: "pointer", background: "none", fontFamily: "var(--mono)",
                    }}>
                      remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
