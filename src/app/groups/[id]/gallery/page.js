"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams } from "next/navigation";
import { addImage, getImages, deleteImage } from "@/lib/gallery";

export default function GalleryPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [images, setImages] = useState([]);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    getImages(id).then(setImages);
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    await addImage(id, user.uid, url.trim(), caption.trim());
    setUrl("");
    setCaption("");
    setShowForm(false);
    setSubmitting(false);
    setImages(await getImages(id));
  }

  async function handleDelete(imageId) {
    await deleteImage(id, imageId);
    setImages(prev => prev.filter(i => i.id !== imageId));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {'// gallery'}
        </p>
        <button onClick={() => setShowForm(!showForm)} style={{
          fontSize: 11, color: "var(--muted)", cursor: "pointer",
          background: "none", border: "none", fontFamily: "var(--mono)",
        }}>
          {showForm ? "cancel" : "+ add image"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: 16, border: "1px solid var(--border)", background: "var(--bg2)" }}>
          <input
            type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://..." autoFocus
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
          />
          <input
            type="text" value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="optional caption"
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
          />
          <button type="submit" disabled={submitting} style={{
            background: "var(--accent)", color: "#0f0f0c", border: "none",
            padding: "8px", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
            cursor: "pointer", opacity: submitting ? 0.5 : 1,
          }}>
            {submitting ? "..." : "add image"}
          </button>
        </form>
      )}

      {viewing && (
        <div
          onClick={() => setViewing(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 24,
          }}
        >
          <img
            src={viewing}
            alt=""
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        </div>
      )}

      {images.length === 0 && !showForm && (
        <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
          no images yet
        </p>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 4,
      }}>
        {images.map(img => (
          <div key={img.id} style={{
            position: "relative", aspectRatio: "1",
            border: "1px solid var(--border)", overflow: "hidden",
            cursor: "pointer",
          }}>
            <img
              src={img.url}
              alt={img.caption || ""}
              onClick={() => setViewing(img.url)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
            {img.caption && (
              <p style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                fontSize: 9, color: "var(--text)", background: "rgba(0,0,0,0.6)",
                padding: "4px 6px", lineHeight: 1.3, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {img.caption}
              </p>
            )}
            <button onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }} style={{
              position: "absolute", top: 4, right: 4,
              fontSize: 9, color: "var(--muted2)", background: "rgba(0,0,0,0.6)",
              border: "none", cursor: "pointer", padding: "2px 5px",
              fontFamily: "var(--mono)", lineHeight: 1,
            }}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
