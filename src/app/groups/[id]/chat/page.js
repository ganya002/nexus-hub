"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getGroup } from "@/lib/firebase";
import { subscribeMessages, sendMessage, loadOlderMessages } from "@/lib/chat";

export default function ChatPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { id, channelId } = useParams();
  const [messages, setMessages] = useState([]);
  const [group, setGroup] = useState(null);
  const [text, setText] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    getGroup(id).then(setGroup);
  }, [id]);

  useEffect(() => {
    if (!id || !channelId) return;
    const unsub = subscribeMessages(id, channelId, (msgs) => {
      setMessages(msgs);
      setHasMore(msgs.length >= 50);
    });
    return unsub;
  }, [id, channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    await sendMessage(id, channelId, user.uid, profile?.displayName || "unknown", text.trim());
    setText("");
    inputRef.current?.focus();
  }

  async function handleLoadOlder() {
    if (!hasMore || messages.length === 0) return;
    const oldest = messages[0]?.createdAt;
    if (!oldest) return;
    const older = await loadOlderMessages(id, channelId, oldest);
    if (older.length < 50) setHasMore(false);
    setMessages(prev => [...older, ...prev]);
  }

  if (loading || !user || !group) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 16px" }}>
        {hasMore && messages.length > 0 && (
          <button onClick={handleLoadOlder} style={{
            fontSize: 11, color: "var(--muted2)", cursor: "pointer",
            background: "none", border: "none", fontFamily: "var(--mono)",
            padding: "12px 0", display: "block", width: "100%", textAlign: "center",
          }}>
            load older messages
          </button>
        )}

        {messages.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
            no messages yet. say something.
          </p>
        )}

        {messages.map(m => (
          <div key={m.id} style={{
            display: "flex", gap: 10, padding: "8px 0",
            alignItems: "flex-start",
          }}>
            <div style={{
              width: 28, height: 28, minWidth: 28,
              border: "1px solid var(--border)", background: "var(--bg3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, color: "var(--text)", letterSpacing: "0.04em",
            }}>
              {m.displayName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{m.displayName}</span>
                <span style={{ fontSize: 10, color: "var(--muted2)" }}>
                  {m.createdAt?.toDate?.()?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" }) || ""}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, wordBreak: "break-word" }}>
                {m.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{
        display: "flex", gap: 8, borderTop: "1px solid var(--border)",
        padding: "12px 0",
      }}>
        <input
          ref={inputRef}
          type="text" value={text} onChange={e => setText(e.target.value)}
          placeholder="type a message..."
          style={{
            flex: 1, background: "var(--bg3)", border: "1px solid var(--border)",
            color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)",
            fontSize: 13, outline: "none",
          }}
        />
        <button type="submit" disabled={!text.trim()} style={{
          background: "var(--accent)", color: "#0f0f0c", border: "none",
          padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
          cursor: "pointer", opacity: !text.trim() ? 0.5 : 1,
        }}>
          send
        </button>
      </form>
    </div>
  );
}
