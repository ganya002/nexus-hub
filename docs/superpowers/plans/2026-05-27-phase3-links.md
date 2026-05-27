# Phase 3 — Links Space Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans.

**Goal:** Shared link board per group — submit URLs with title + optional note, sorted newest first.

**Tech Stack:** Next.js 14, Firestore, inline styles

---

## Tasks

### Task 1: Create links lib

**Files:**
- Create: `src/lib/links.js`

- [ ] **Step 1: Create src/lib/links.js**

```js
import {
  collection, addDoc, getDocs,
  query, orderBy, limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const LINK_LIMIT = 50;

export async function addLink(groupId, uid, url, title, note = "") {
  let hostname = "";
  try { hostname = new URL(url).hostname.replace("www.", ""); } catch {}
  const ref = await addDoc(collection(db, "groups", groupId, "links"), {
    uid,
    url,
    title,
    note,
    hostname,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getLinks(groupId) {
  const q = query(
    collection(db, "groups", groupId, "links"),
    orderBy("createdAt", "desc"),
    limit(LINK_LIMIT)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/links.js
git commit -m "feat: add link helpers"
```

---

### Task 2: Build the links page

**Files:**
- Modify: `src/app/groups/[id]/links/page.js`

- [ ] **Step 1: Replace placeholder with links UI**

```js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams } from "next/navigation";
import { addLink, getLinks } from "@/lib/links";

export default function LinksPage() {
  const { user, profile } = useAuth();
  const { id } = useParams();
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLinks(id).then(setLinks);
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;
    setSubmitting(true);
    await addLink(id, user.uid, url.trim(), title.trim(), note.trim());
    setUrl("");
    setTitle("");
    setNote("");
    setShowForm(false);
    setSubmitting(false);
    const updated = await getLinks(id);
    setLinks(updated);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {'// links'}
        </p>
        <button onClick={() => setShowForm(!showForm)} style={{
          fontSize: 11, color: "var(--muted)", cursor: "pointer",
          background: "none", border: "none", fontFamily: "var(--mono)",
        }}>
          {showForm ? "cancel" : "+ add link"}
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
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="title"
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
          />
          <input
            type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="optional note"
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
          />
          <button type="submit" disabled={submitting} style={{
            background: "var(--accent)", color: "#0f0f0c", border: "none",
            padding: "8px", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
            cursor: "pointer", opacity: submitting ? 0.5 : 1,
          }}>
            {submitting ? "..." : "save link"}
          </button>
        </form>
      )}

      {links.length === 0 && !showForm && (
        <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
          no links yet
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {links.map(l => (
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" style={{
            padding: "16px", background: "var(--bg)", border: "1px solid var(--border)",
            textDecoration: "none", display: "block",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "var(--accent)" }}>{l.title}</span>
              <span style={{ fontSize: 10, color: "var(--muted2)", whiteSpace: "nowrap", marginLeft: 12 }}>{l.hostname}</span>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5, wordBreak: "break-all" }}>{l.url}</p>
            {l.note && <p style={{ fontSize: 11, color: "var(--muted2)", marginTop: 6, lineHeight: 1.5 }}>{l.note}</p>}
          </a>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build && npm run lint
```

- [ ] **Step 3: Commit and push**

```bash
git add src/lib/links.js src/app/groups/\[id\]/links/page.js
git commit -m "feat: add links space with submission and display"
git push
```
