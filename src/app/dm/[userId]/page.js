"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getUserProfile } from "@/lib/firebase";
import { getOrCreateDM, subscribeDMMessages, sendDMMessage, loadOlderDMMessages } from "@/lib/dms";

export default function DmConversationPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { userId } = useParams();
  const [other, setOther] = useState(null);
  const [dm, setDm] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!userId) return;
    getUserProfile(userId).then(p => {
      if (!p) router.push("/dm");
      else setOther(p);
    });
  }, [userId, router]);

  useEffect(() => {
    if (!user || !userId) return;
    getOrCreateDM(user.uid, userId).then(setDm);
  }, [user, userId]);

  useEffect(() => {
    if (!dm?.id) return;
    const unsub = subscribeDMMessages(dm.id, (msgs) => {
      setMessages(msgs);
      setHasMore(msgs.length >= 50);
    });
    return unsub;
  }, [dm?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !dm?.id || !user) return;
    await sendDMMessage(dm.id, user.uid, text.trim());
    setText("");
    inputRef.current?.focus();
  }

  async function handleLoadOlder() {
    if (!hasMore || messages.length === 0 || !dm?.id) return;
    const oldest = messages[0]?.createdAt;
    if (!oldest) return;
    const older = await loadOlderDMMessages(dm.id, oldest);
    if (older.length < 50) setHasMore(false);
    setMessages(prev => [...older, ...prev]);
  }

  if (loading || !user || !other) return null;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={() => router.push("/dm")} style={{
          fontSize: 14, color: "var(--muted2)", cursor: "pointer",
          background: "none", border: "none", fontFamily: "var(--mono)", padding: 0,
        }}>
          ←
        </button>
        <div style={{
          width: 24, height: 24, border: "1px solid var(--border)", background: "var(--bg3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "var(--text)",
        }}>
          {other.displayName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
        </div>
        <div>
          <span style={{ fontSize: 14, color: "var(--text)", fontFamily: "var(--serif)", fontWeight: 300 }}>
            {other.displayName}
          </span>
          {other.username && (
            <span style={{ fontSize: 10, color: "var(--muted2)", marginLeft: 6 }}>@{other.username}</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 280px)" }}>
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

          {messages.map(m => {
            const isMe = m.uid === user.uid;
            return (
              <div key={m.id} style={{
                display: "flex", gap: 10, padding: "8px 0",
                alignItems: "flex-start",
              }}>
                {!isMe && (
                  <div style={{
                    width: 28, height: 28, minWidth: 28,
                    border: "1px solid var(--border)", background: "var(--bg3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "var(--text)", letterSpacing: "0.04em",
                  }}>
                    {other.displayName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div style={{ minWidth: 0, marginLeft: isMe ? 38 : 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                    <span style={{
                      fontSize: 12,
                      color: isMe ? "var(--muted)" : "var(--accent)",
                      fontWeight: 500,
                    }}>
                      {isMe ? "you" : m.displayName || other.displayName}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--muted2)" }}>
                      {m.createdAt?.toDate?.()?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" }) || ""}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13, color: "var(--text)", lineHeight: 1.5, wordBreak: "break-word",
                    textAlign: isMe ? "right" : "left",
                  }}>
                    {m.text}
                  </p>
                </div>
              </div>
            );
          })}
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
    </main>
  );
}
