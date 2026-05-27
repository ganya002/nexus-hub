"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getGroup } from "@/lib/firebase";
import { subscribeMessages, sendMessage, loadOlderMessages, uploadMedia } from "@/lib/chat";

const ACCEPTED = "image/*,video/*";

export default function ChannelChatPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { id, channelId } = useParams();
  const [messages, setMessages] = useState([]);
  const [group, setGroup] = useState(null);
  const [text, setText] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const mediaFilesRef = useRef([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

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

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    mediaFilesRef.current = files;
    if (files.length === 1) {
      setMediaPreview(URL.createObjectURL(files[0]));
    } else {
      setMediaPreview(`${files.length} files selected`);
    }
  }

  function clearMedia() {
    mediaFilesRef.current = [];
    setMediaPreview(null);
    setUploadProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSend(e) {
    e.preventDefault();
    if ((!text.trim() && mediaFilesRef.current.length === 0) || !user) return;
    setUploading(true);

    const media = [];
    for (const file of mediaFilesRef.current) {
      const item = await uploadMedia(file, id, channelId, (p) => setUploadProgress(p));
      media.push(item);
    }

    await sendMessage(id, channelId, user.uid, profile?.displayName || "unknown", text.trim(), media);
    setText("");
    clearMedia();
    setUploading(false);
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

  function isVideo(url) {
    return /\.(mp4|webm|mov|avi|mkv)$/i.test(url);
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
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{m.displayName}</span>
                <span style={{ fontSize: 10, color: "var(--muted2)" }}>
                  {m.createdAt?.toDate?.()?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" }) || ""}
                </span>
              </div>
              {m.text && (
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, wordBreak: "break-word", marginBottom: m.media?.length ? 6 : 0 }}>
                  {m.text}
                </p>
              )}
              {m.media?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {m.media.map((item, i) => (
                    item.type === "video" ? (
                      <video
                        key={i} src={item.url} controls
                        preload="metadata"
                        style={{ maxWidth: 240, maxHeight: 180, border: "1px solid var(--border)", borderRadius: 4, display: "block" }}
                      />
                    ) : (
                      <img
                        key={i} src={item.url} alt={item.name || ""}
                        onClick={() => setLightbox(item.url)}
                        style={{ maxWidth: 240, maxHeight: 180, border: "1px solid var(--border)", borderRadius: 4, display: "block", cursor: "pointer", objectFit: "cover" }}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 24,
        }}>
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}

      <form onSubmit={handleSend} style={{
        display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--border)",
        padding: "8px 0",
      }}>
        {mediaPreview && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
            {typeof mediaPreview === "string" && mediaPreview.startsWith("blob:") ? (
              <img src={mediaPreview} alt="" style={{ height: 40, width: 40, objectFit: "cover", border: "1px solid var(--border)", borderRadius: 4 }} />
            ) : (
              <span style={{ fontSize: 11, color: "var(--muted2)" }}>{mediaPreview}</span>
            )}
            {uploading ? (
              <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2 }}>
                <div style={{ width: `${uploadProgress * 100}%`, height: 4, background: "var(--accent)", borderRadius: 2, transition: "width 0.2s" }} />
              </div>
            ) : (
              <button type="button" onClick={clearMedia} style={{
                fontSize: 9, color: "var(--danger)", background: "none",
                border: "1px solid var(--danger)", cursor: "pointer",
                padding: "2px 6px", fontFamily: "var(--mono)",
              }}>
                remove
              </button>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{
            fontSize: 11, padding: "10px 12px", border: "1px solid var(--border)",
            color: "var(--muted)", cursor: "pointer", background: "none",
            fontFamily: "var(--mono)", opacity: uploading ? 0.5 : 1,
          }}>
            +
          </button>
          <input ref={fileRef} type="file" accept={ACCEPTED} multiple onChange={handleFiles} style={{ display: "none" }} />
          <input
            ref={inputRef}
            type="text" value={text} onChange={e => setText(e.target.value)}
            placeholder={uploading ? "uploading..." : "type a message..."}
            disabled={uploading}
            style={{
              flex: 1, background: "var(--bg3)", border: "1px solid var(--border)",
              color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)",
              fontSize: 13, outline: "none", opacity: uploading ? 0.5 : 1,
            }}
          />
          <button type="submit" disabled={(!text.trim() && mediaFilesRef.current.length === 0) || uploading} style={{
            background: "var(--accent)", color: "#0f0f0c", border: "none",
            padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", opacity: (!text.trim() && mediaFilesRef.current.length === 0) || uploading ? 0.5 : 1,
          }}>
            {uploading ? `${Math.round(uploadProgress * 100)}%` : "send"}
          </button>
        </div>
      </form>
    </div>
  );
}
