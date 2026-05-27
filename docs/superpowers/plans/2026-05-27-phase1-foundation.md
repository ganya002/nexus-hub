# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auth with email verification + unique usernames, group CRUD, invite system, bottom nav, and group interior shell.

**Architecture:** Next.js App Router with Firebase Auth + Firestore. Pages use React Server Components where possible; auth state provided via AuthContext client wrapper. Data helpers split into purpose-specific lib files.

**Tech Stack:** Next.js 14, Firebase Auth, Firestore, CSS Modules

**Visual direction:** Warm palette (gold accent `#c9a96e`), grain texture overlay, DM Mono + Fraunces fonts. No AI-generic dark mode feel.

---

## File Structure

### New files to create:
- `src/lib/users.js` — user CRUD (checkUsername, createUserProfile, getProfile, updateDisplayName)
- `src/lib/groups.js` — group CRUD (createGroup, getGroups, joinGroup, leaveGroup, getMembers, deleteGroup)
- `src/lib/invites.js` — invite CRUD (createInvite, getInvite, redeemInvite)
- `src/app/verify/page.js` — email verification prompt
- `src/app/setup-username/page.js` — post-verification username picker
- `src/app/home/page.js` — discover groups landing
- `src/app/groups/page.js` — your groups + discover tabs
- `src/app/groups/create/page.js` — create group form
- `src/app/groups/[id]/page.js` — group interior (placeholder spaces)
- `src/app/groups/[id]/layout.js` — group interior layout with sub-nav
- `src/app/groups/[id]/chat/page.js` — chat placeholder
- `src/app/groups/[id]/links/page.js` — links placeholder
- `src/app/groups/[id]/voice/page.js` — voice placeholder
- `src/app/join/[code]/page.js` — invite link landing
- `src/app/profile/page.js` — profile + settings
- `src/components/BottomNav.js` — global bottom navigation
- `src/components/GroupSubNav.js` — inside-group bottom navigation

### Files to modify:
- `src/lib/firebase.js` — add Firestore helpers for users/groups/invites
- `src/lib/AuthContext.js` — email verification flow, username gate
- `src/components/AuthModal.js` — email verification state after signup
- `src/app/layout.js` — wrap with BottomNav
- `src/app/page.js` — logged-out landing, redirect when logged in
- `src/app/globals.css` — bottom nav styles
- `next.config.js` — add image domains if needed

---

## Tasks

### Task 1: Add user helpers to firebase lib

**Files:**
- Modify: `src/lib/firebase.js`

- [ ] **Step 1: Add Firestore helper imports and exports**

```js
import {
  getFirestore, doc, setDoc, getDoc, getDocs,
  collection, query, where, orderBy, limit,
  serverTimestamp, runTransaction, deleteDoc, updateDoc,
} from "firebase/firestore";

export const db = getFirestore(app);
```

- [ ] **Step 2: Add exports to the existing firebase.js**

Replace the existing `export const db = getFirestore(app);` line and add the helper functions after the existing `getMembers` function:

The updated file should include all the existing code plus these additions at the bottom:

```js
// ── users ──

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), {
    ...data,
    photoURL: null,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}

export async function checkUsername(username) {
  const snap = await getDoc(doc(db, "usernames", username.toLowerCase()));
  return !snap.exists();
}

export async function reserveUsername(username, uid) {
  await setDoc(doc(db, "usernames", username.toLowerCase()), { uid });
}

// ── groups ──

export async function createGroup(data) {
  const ref = doc(collection(db, "groups"));
  await setDoc(ref, {
    ...data,
    memberCount: 1,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getGroup(id) {
  const snap = await getDoc(doc(db, "groups", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getGroupsByCategory(category = null, limitCount = 20) {
  const constraints = [orderBy("memberCount", "desc"), limit(limitCount)];
  if (category) constraints.unshift(where("category", "==", category));
  const snap = await getDocs(query(collection(db, "groups"), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addMember(groupId, uid, displayName, role = "member") {
  await setDoc(doc(db, "groups", groupId, "members", uid), {
    role,
    displayName,
    joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "groups", groupId), {
    memberCount: increment(1),
  });
}

export async function removeMember(groupId, uid) {
  await deleteDoc(doc(db, "groups", groupId, "members", uid));
  await updateDoc(doc(db, "groups", groupId), {
    memberCount: increment(-1),
  });
}

export async function getMembers(groupId) {
  const snap = await getDocs(collection(db, "groups", groupId, "members"));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function getUserGroups(uid) {
  const snap = await getDocs(collection(db, "groups"));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // client-side filter — fine for friend-group scale
  const memberSnap = await getDocs(collectionGroup(db, "members"));
  const groupIds = memberSnap.docs
    .filter(d => d.id === uid)
    .map(d => d.ref.parent.parent?.id)
    .filter(Boolean);
  return all.filter(g => groupIds.includes(g.id));
}

// ── invites ──

export async function createInvite(groupId, createdBy, expiresAt) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  await setDoc(doc(db, "invites", code), {
    groupId,
    createdBy,
    expiresAt,
    uses: 0,
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function getInvite(code) {
  const snap = await getDoc(doc(db, "invites", code.toUpperCase()));
  return snap.exists() ? { code: snap.id, ...snap.data() } : null;
}

export async function useInvite(code) {
  const ref = doc(db, "invites", code.toUpperCase());
  await updateDoc(ref, { uses: increment(1) });
}
```

Also need to import `increment` and `collectionGroup` at the top:

```js
import {
  getFirestore, doc, setDoc, getDoc, getDocs,
  collection, collectionGroup, query, where, orderBy, limit,
  serverTimestamp, runTransaction, increment,
  deleteDoc, updateDoc,
} from "firebase/firestore";
```

- [ ] **Step 3: Verify the file parses**

Run: `cd nexus && node -e "require('./src/lib/firebase.js')" 2>&1 | head -5`
Expected: either runs (server-side) or shows a "window is not defined" error (expected for client-side Firebase import — confirms no syntax errors)

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase.js
git commit -m "feat: add user, group, invite helpers to firebase lib"
```

---

### Task 2: Update AuthContext for email verification + username gate

**Files:**
- Modify: `src/lib/AuthContext.js`

- [ ] **Step 1: Rewrite AuthContext to track email verification and username status**

```js
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuth } from "@/lib/firebase";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuth(async (u) => {
      setUser(u);
      if (u) {
        const { getUserProfile } = await import("@/lib/firebase");
        const p = await getUserProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  async function refreshProfile() {
    if (!user) return;
    const { getUserProfile } = await import("@/lib/firebase");
    const p = await getUserProfile(user.uid);
    setProfile(p);
  }

  const needsVerification = user && !user.emailVerified;
  const needsUsername = user && user.emailVerified && profile && !profile.username;

  return (
    <Ctx.Provider value={{ user, profile, loading, needsVerification, needsUsername, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/AuthContext.js
git commit -m "feat: update AuthContext with email verification and username gate"
```

---

### Task 3: Update AuthModal with verification state

**Files:**
- Modify: `src/components/AuthModal.js`

- [ ] **Step 1: Rewrite AuthModal to show verification prompt after signup**

```js
"use client";
import { useState } from "react";
import { signUp, logIn, sendEmailVerification } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import styles from "./AuthModal.module.css";

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { refreshProfile } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!displayName.trim()) { setError("need a name"); setLoading(false); return; }
        const { user } = await signUp(email, password, displayName.trim());
        await sendEmailVerification(user);
        setSent(true);
      } else {
        await logIn(email, password);
        refreshProfile();
        onClose();
      }
    } catch (err) {
      const msg = err.code === "auth/email-already-in-use" ? "that email's taken"
        : err.code === "auth/invalid-credential" ? "wrong email or password"
        : err.code === "auth/weak-password" ? "password too weak (6+ chars)"
        : err.code === "auth/too-many-requests" ? "too many attempts, try later"
        : err.message;
      setError(msg);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <span className={styles.tag}>check your email</span>
            <button className={styles.close} onClick={onClose}>✕</button>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 8 }}>
            we sent a verification link to <strong style={{ color: "var(--text)" }}>{email}</strong>.
          </p>
          <p style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.6 }}>
            click it, then log back in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.tag}>{'// nexus'}</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={mode === "login" ? styles.activeTab : styles.tab}
            onClick={() => { setMode("login"); setError(""); }}
          >log in</button>
          <button
            className={mode === "signup" ? styles.activeTab : styles.tab}
            onClick={() => { setMode("signup"); setError(""); }}
          >sign up</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === "signup" && (
            <div className={styles.field}>
              <label>display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="what people see"
                autoFocus
              />
            </div>
          )}
          <div className={styles.field}>
            <label>email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@somewhere.com"
              autoFocus={mode === "login"}
            />
          </div>
          <div className={styles.field}>
            <label>password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "..." : mode === "login" ? "log in →" : "create account →"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

We also need to add `sendEmailVerification` to the firebase import. In `src/lib/firebase.js`, add it to the auth imports:

```js
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
} from "firebase/auth";
```

And export it:

```js
export { sendEmailVerification };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AuthModal.js src/lib/firebase.js
git commit -m "feat: add email verification flow after signup"
```

---

### Task 4: Create verify page + username setup page

**Files:**
- Create: `src/app/verify/page.js`
- Create: `src/app/setup-username/page.js`

- [ ] **Step 1: Create src/app/verify/page.js**

```js
"use client";
import { useAuth } from "@/lib/AuthContext";
import { sendEmailVerification } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function VerifyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.emailVerified) router.push("/setup-username");
  }, [user, router]);

  async function resend() {
    if (user) {
      await sendEmailVerification(user);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    }
  }

  if (loading || !user) return null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 48, marginBottom: 20 }}>
        check your email
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>
        we sent a verification link to <strong style={{ color: "var(--text)" }}>{user.email}</strong>.
      </p>
      <p style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.7, marginBottom: 32 }}>
        didn&apos;t get it? check spam, or{` `}
        <button onClick={resend} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12, textDecoration: "underline" }}>
          {resent ? "sent!" : "resend"}
        </button>
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Create src/app/setup-username/page.js**

```js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { checkUsername, reserveUsername, updateUserProfile } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function SetupUsernamePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [taken, setTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && profile?.username) router.push("/home");
  }, [user, profile, loading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleaned || cleaned.length < 2) {
      setError("username must be at least 2 characters (letters, numbers, underscores)");
      return;
    }
    setSubmitting(true);
    try {
      const available = await checkUsername(cleaned);
      if (!available) { setTaken(true); setSubmitting(false); return; }
      await reserveUsername(cleaned, user.uid);
      await updateUserProfile(user.uid, { username: cleaned });
      router.push("/home");
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  if (loading || profile?.username) return null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 48, marginBottom: 12 }}>
        pick a username
      </h1>
      <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 32 }}>
        this is your @handle — used for invites and DMs
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>username</label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setTaken(false); }}
            placeholder="letters, numbers, underscores"
            autoFocus
            style={{
              background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)",
              padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 13, outline: "none",
            }}
          />
        </div>

        {taken && <p style={{ fontSize: 12, color: "var(--danger)" }}>that username&apos;s taken</p>}
        {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{
          background: "var(--accent)", color: "#0f0f0c", border: "none",
          padding: 11, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
          cursor: "pointer", transition: "background 0.2s",
          opacity: submitting ? 0.5 : 1,
        }}>
          {submitting ? "..." : "set username →"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/verify/page.js src/app/setup-username/page.js
git commit -m "feat: add verify email and username setup pages"
```

---

### Task 5: Create bottom nav component

**Files:**
- Create: `src/components/BottomNav.js`
- Modify: `src/app/layout.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create src/components/BottomNav.js**

```js
"use client";
import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { href: "/home", label: "home" },
  { href: "/dm", label: "dms" },
  { href: "/groups", label: "groups" },
  { href: "/profile", label: "profile" },
];

export default function BottomNav() {
  const { user, loading } = useAuth();
  const path = usePathname();

  if (loading || !user) return null;

  const hideOn = ["/verify", "/setup-username"];
  if (hideOn.includes(path)) return null;

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--bg2)", borderTop: "1px solid var(--border)",
      display: "flex", justifyContent: "space-around",
      padding: "8px 0", zIndex: 50,
    }}>
      {TABS.map(t => {
        const active = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
            color: active ? "var(--accent)" : "var(--muted2)",
            textDecoration: "none", padding: "4px 8px",
            transition: "color 0.2s",
          }}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Update src/app/layout.js to include BottomNav**

```js
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import BottomNav from "@/components/BottomNav";

export const metadata = {
  title: "nexus",
  description: "our little corner",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Add bottom nav padding to globals.css**

In `src/app/globals.css`, add this at the bottom of the file:

```css
body { padding-bottom: 48px; }
```

- [ ] **Step 4: Commit**

```bash
git add src/components/BottomNav.js src/app/layout.js src/app/globals.css
git commit -m "feat: add bottom navigation bar"
```

---

### Task 6: Update landing page + create home page

**Files:**
- Modify: `src/app/page.js`
- Create: `src/app/home/page.js`

- [ ] **Step 1: Rewrite src/app/page.js as a logged-out landing**

```js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";

export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!loading && user) router.push("/home");
  }, [user, loading, router]);

  if (loading) return null;
  if (user) return null;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 80px" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "32px 0 20px", borderBottom: "1px solid var(--border)", marginBottom: 80,
      }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 300, fontStyle: "italic" }}>
          nexus
        </span>
        <button onClick={() => setShowAuth(true)} style={{
          fontSize: 12, color: "var(--muted)", cursor: "pointer",
          padding: "5px 10px", border: "1px solid var(--border)",
          background: "none", fontFamily: "var(--mono)",
          transition: "color 0.2s, border-color 0.2s",
        }}>
          log in / sign up
        </button>
      </nav>

      <section style={{ marginBottom: 80 }}>
        <p style={{ fontSize: 12, color: "var(--accent)", marginBottom: 20, letterSpacing: "0.06em" }}>
          {'// for friend groups'}
        </p>
        <h1 style={{
          fontFamily: "var(--serif)", fontSize: "clamp(72px, 14vw, 120px)",
          fontWeight: 300, fontStyle: "italic", lineHeight: 0.85,
          color: "var(--text)", marginBottom: 24, letterSpacing: "-0.03em",
        }}>
          nexus
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 320, lineHeight: 1.7 }}>
          private hubs for your people. chat, links, voice — whatever your group needs.
        </p>
      </section>

      <section style={{ marginBottom: 72 }}>
        <p style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 20, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {'// how it works'}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
          {[
            { label: "create a group", desc: "set up a hub for your friends in seconds." },
            { label: "add spaces", desc: "chat rooms, link boards, voice channels — whatever fits." },
            { label: "invite people", desc: "share a link. they join. that's it." },
            { label: "it's yours", desc: "no algorithm, no ads, just your group." },
          ].map((item, i) => (
            <div key={i} style={{
              background: "var(--bg)", padding: 24,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <span style={{ fontSize: 14, color: "var(--text)" }}>{item.label}</span>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 24, borderTop: "1px solid var(--border)",
        fontSize: 11, color: "var(--muted2)",
      }}>
        <span>nexus · private</span>
        <button onClick={() => setShowAuth(true)} style={{
          fontSize: 11, color: "var(--muted)", cursor: "pointer",
          background: "none", border: "none", fontFamily: "var(--mono)",
          transition: "color 0.2s",
        }}>
          join the group →
        </button>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
```

- [ ] **Step 2: Create src/app/home/page.js**

```js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getGroupsByCategory } from "@/lib/firebase";
import Link from "next/link";

const CATEGORIES = ["gaming", "music", "art", "tech", "study", "sports", "other"];

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [category, setCategory] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  useEffect(() => {
    getGroupsByCategory(category).then(setGroups);
  }, [category]);

  if (loading || !user) return null;

  const filtered = groups.filter(g =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 24 }}>
        discover
      </h1>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="search groups..."
        style={{
          width: "100%", background: "var(--bg3)", border: "1px solid var(--border)",
          color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)",
          fontSize: 13, outline: "none", marginBottom: 20,
        }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
        <button onClick={() => setCategory(null)} style={{
          fontSize: 11, padding: "4px 10px", border: "1px solid var(--border)",
          background: category === null ? "var(--border)" : "none",
          color: category === null ? "var(--text)" : "var(--muted)",
          cursor: "pointer", fontFamily: "var(--mono)", transition: "color 0.2s, background 0.2s",
        }}>
          trending
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            fontSize: 11, padding: "4px 10px", border: "1px solid var(--border)",
            background: category === c ? "var(--border)" : "none",
            color: category === c ? "var(--text)" : "var(--muted)",
            cursor: "pointer", fontFamily: "var(--mono)", transition: "color 0.2s, background 0.2s",
          }}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--muted2)", padding: 40, textAlign: "center" }}>
          {search ? "no groups match that search" : "no groups yet — be the first to create one"}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
        {filtered.map(g => (
          <Link key={g.id} href={`/groups/${g.id}`} style={{
            background: "var(--bg)", padding: 20, textDecoration: "none",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            transition: "background 0.2s",
          }}>
            <div>
              <span style={{ fontSize: 14, color: "var(--text)", display: "block", marginBottom: 4 }}>{g.name}</span>
              <span style={{ fontSize: 11, color: "var(--muted2)" }}>{g.description}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 10, color: "var(--muted2)" }}>{g.memberCount} {g.memberCount === 1 ? "member" : "members"}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", display: "block" }}>{g.category}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.js src/app/home/page.js
git commit -m "feat: logged-out landing page and discover home page"
```

---

### Task 7: Create groups pages (list, create, interior)

**Files:**
- Create: `src/app/groups/page.js`
- Create: `src/app/groups/create/page.js`
- Create: `src/app/groups/[id]/page.js`
- Create: `src/app/groups/[id]/layout.js`
- Create: `src/app/groups/[id]/chat/page.js`
- Create: `src/app/groups/[id]/links/page.js`
- Create: `src/app/groups/[id]/voice/page.js`
- Create: `src/components/GroupSubNav.js`

- [ ] **Step 1: Create src/components/GroupSubNav.js**

```js
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { href: "/chat", label: "chat" },
  { href: "/links", label: "links" },
  { href: "/voice", label: "voice" },
];

export default function GroupSubNav({ groupId }) {
  const path = usePathname();

  return (
    <nav style={{
      display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24,
    }}>
      {TABS.map(t => {
        const full = `/groups/${groupId}${t.href}`;
        const active = path === full;
        return (
          <Link key={t.href} href={full} style={{
            fontSize: 12, padding: "8px 0", marginRight: 20,
            color: active ? "var(--text)" : "var(--muted2)",
            borderBottom: active ? "1px solid var(--accent)" : "1px solid transparent",
            marginBottom: -1, textDecoration: "none", fontFamily: "var(--mono)",
            transition: "color 0.2s",
          }}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create src/app/groups/[id]/layout.js**

```js
import GroupSubNav from "@/components/GroupSubNav";

export default function GroupLayout({ children, params }) {
  return (
    <div>
      <GroupSubNav groupId={params.id} />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create placeholder space pages**

`src/app/groups/[id]/chat/page.js`:
```js
"use client";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const { id } = useParams();
  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
        chat coming in phase 2
      </p>
    </div>
  );
}
```

`src/app/groups/[id]/links/page.js`:
```js
"use client";
import { useParams } from "next/navigation";

export default function LinksPage() {
  const { id } = useParams();
  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
        links coming in phase 2
      </p>
    </div>
  );
}
```

`src/app/groups/[id]/voice/page.js`:
```js
"use client";
import { useParams } from "next/navigation";

export default function VoicePage() {
  const { id } = useParams();
  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
        voice coming in phase 2
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create src/app/groups/page.js**

```js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getGroupsByCategory } from "@/lib/firebase";
import Link from "next/link";

export default function GroupsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("yours");
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  useEffect(() => {
    getGroupsByCategory().then(setGroups);
  }, []);

  if (loading || !user) return null;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28 }}>
          groups
        </h1>
        <Link href="/groups/create" style={{
          fontSize: 12, padding: "5px 10px", border: "1px solid var(--border)",
          color: "var(--muted)", textDecoration: "none", fontFamily: "var(--mono)",
          transition: "color 0.2s, border-color 0.2s",
        }}>
          + new group
        </Link>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
        <button onClick={() => setTab("yours")} style={{
          fontSize: 12, padding: "8px 0", marginRight: 20,
          background: "none", border: "none", fontFamily: "var(--mono)", cursor: "pointer",
          color: tab === "yours" ? "var(--text)" : "var(--muted2)",
          borderBottom: tab === "yours" ? "1px solid var(--accent)" : "1px solid transparent",
          marginBottom: -1, transition: "color 0.2s",
        }}>
          your groups
        </button>
        <button onClick={() => setTab("discover")} style={{
          fontSize: 12, padding: "8px 0", marginRight: 20,
          background: "none", border: "none", fontFamily: "var(--mono)", cursor: "pointer",
          color: tab === "discover" ? "var(--text)" : "var(--muted2)",
          borderBottom: tab === "discover" ? "1px solid var(--accent)" : "1px solid transparent",
          marginBottom: -1, transition: "color 0.2s",
        }}>
          discover
        </button>
      </div>

      {tab === "discover" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
          {groups.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted2)", padding: 40, textAlign: "center" }}>
              no public groups yet
            </p>
          )}
          {groups.map(g => (
            <Link key={g.id} href={`/groups/${g.id}`} style={{
              background: "var(--bg)", padding: 20, textDecoration: "none",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              transition: "background 0.2s",
            }}>
              <div>
                <span style={{ fontSize: 14, color: "var(--text)", display: "block", marginBottom: 4 }}>{g.name}</span>
                <span style={{ fontSize: 11, color: "var(--muted2)" }}>{g.description}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, color: "var(--muted2)" }}>{g.memberCount} {g.memberCount === 1 ? "member" : "members"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "yours" && (
        <p style={{ fontSize: 12, color: "var(--muted2)", padding: 40, textAlign: "center" }}>
          your groups will show here — join some or create one
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Create src/app/groups/create/page.js**

```js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { createGroup, addMember } from "@/lib/firebase";

const CATEGORIES = ["gaming", "music", "art", "tech", "study", "sports", "other"];

export default function CreateGroupPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("other");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("group needs a name"); return; }
    setSubmitting(true);
    try {
      const groupId = await createGroup({
        name: name.trim(),
        description: desc.trim(),
        category,
        createdBy: user.uid,
      });
      await addMember(groupId, user.uid, user.displayName || "unknown", "owner");
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  if (loading || !user) return null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 24 }}>
        create a group
      </h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>name</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="your group's name"
            autoFocus
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>description</label>
          <input
            type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="what's your group about?"
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>category</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCategory(c)} style={{
                fontSize: 11, padding: "4px 10px", border: "1px solid var(--border)",
                background: category === c ? "var(--border)" : "none",
                color: category === c ? "var(--text)" : "var(--muted)",
                cursor: "pointer", fontFamily: "var(--mono)", transition: "color 0.2s, background 0.2s",
              }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{
          background: "var(--accent)", color: "#0f0f0c", border: "none",
          padding: 11, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
          cursor: "pointer", opacity: submitting ? 0.5 : 1, transition: "background 0.2s",
          marginTop: 4,
        }}>
          {submitting ? "..." : "create group →"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 6: Create src/app/groups/[id]/page.js**

```js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getGroup, getMembers } from "@/lib/firebase";

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
  }, [id]);

  if (loading || !user || !group) return null;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 8 }}>
        {group.name}
      </h1>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{group.description}</p>
      <p style={{ fontSize: 10, color: "var(--muted2)", marginBottom: 24 }}>
        {members.length} {members.length === 1 ? "member" : "members"} · {group.category}
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
    </main>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/groups/ src/components/GroupSubNav.js
git commit -m "feat: groups pages with interior layout and placeholder spaces"
```

---

### Task 8: Create invite system

**Files:**
- Create: `src/app/join/[code]/page.js`
- Modify: `src/app/groups/[id]/page.js` (add invite section)

- [ ] **Step 1: Create src/app/join/[code]/page.js**

```js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getInvite, useInvite, getGroup, addMember, getUserProfile } from "@/lib/firebase";

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
      await useInvite(code);
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
              cursor: "pointer", transition: "background 0.2s",
            }}>
              join group →
            </button>
          )}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Update src/app/groups/[id]/page.js to show invite section**

Add after the members list and before the closing `</main>`:

```jsx
{/* invite section */}
<div style={{ marginTop: 32, padding: 20, border: "1px solid var(--border)", background: "var(--bg2)" }}>
  <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em" }}>
    {'// invite link'}
  </p>
  <InviteSection groupId={id} />
</div>
```

And add the invite section as a separate component at the bottom (or import it). Actually, to keep it simple, add an inline state:

Actually let me just add a simple invite section directly into the page. Update the page to include invite link generation:

Add the import:
```js
import { createInvite } from "@/lib/firebase";
import { useState } from "react";
```

Add this after the members section, before the closing `</main>`:

```jsx
<div style={{ marginTop: 32, padding: 20, border: "1px solid var(--border)", background: "var(--bg2)" }}>
  <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em" }}>
    {'// invite'}
  </p>
  <InviteControls groupId={id} />
</div>
```

And add an InviteControls component. Let me put this at the bottom of the same file before the export. Wait, since this is a page component, it gets a bit awkward. Let me create a separate invite component instead.

Actually, let me just keep it simple and put the invite logic inline. Update the imports and add a section:

- [ ] **Step 3: Create a simple invite component**

`src/components/InviteControls.js`:

```js
"use client";
import { useState } from "react";
import { createInvite } from "@/lib/firebase";

export default function InviteControls({ groupId }) {
  const [code, setCode] = useState(null);
  const [duration, setDuration] = useState(86400000); // 24h default
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
        {[
          { label: "24h", value: 86400000 },
          { label: "7d", value: 604800000 },
          { label: "30d", value: 2592000000 },
          { label: "never", value: 0 },
        ].map(d => (
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
            {window.location.origin}/join/{code}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update group page to include InviteControls**

Modify `src/app/groups/[id]/page.js` to include the invite section:

```jsx
import InviteControls from "@/components/InviteControls";
```

Add this inside the `<main>` after the members section:

```jsx
<div style={{ marginTop: 32, padding: 20, border: "1px solid var(--border)", background: "var(--bg2)" }}>
  <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em" }}>
    {'// invite'}
  </p>
  <InviteControls groupId={id} />
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/app/join/ src/components/InviteControls.js src/app/groups/\[id\]/page.js
git commit -m "feat: invite system with expiration options"
```

---

### Task 9: Create profile page

**Files:**
- Create: `src/app/profile/page.js`

- [ ] **Step 1: Create src/app/profile/page.js**

```js
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { updateUserProfile, logOut } from "@/lib/firebase";

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName);
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    await updateUserProfile(user.uid, { displayName: displayName.trim() });
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || !user) return null;

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 24 }}>
        profile
      </h1>

      <div style={{ marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, border: "1px solid var(--border)", background: "var(--bg3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, color: "var(--text)", letterSpacing: "0.04em", marginBottom: 12,
        }}>
          {profile?.displayName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted2)" }}>
          @{profile?.username || "..."}
        </p>
        <p style={{ fontSize: 11, color: "var(--muted2)", marginTop: 4 }}>
          {user.email}
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>display name</label>
          <input
            type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
          />
        </div>
        <button type="submit" disabled={saving} style={{
          background: "var(--accent)", color: "#0f0f0c", border: "none",
          padding: 11, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
          cursor: "pointer", opacity: saving ? 0.5 : 1, transition: "background 0.2s",
        }}>
          {saving ? "..." : saved ? "saved!" : "save"}
        </button>
      </form>

      <button onClick={logOut} style={{
        fontSize: 12, color: "var(--danger)", cursor: "pointer",
        background: "none", border: "1px solid var(--danger)", fontFamily: "var(--mono)",
        padding: "8px 16px", transition: "opacity 0.2s",
      }}>
        sign out
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/profile/page.js
git commit -m "feat: profile page with display name editing"
```

---

### Task 10: Verify build

**Files:**
- No file changes — run build

- [ ] **Step 1: Run the build**

```bash
npm run build 2>&1
```

Expected: `✓ Compiled successfully`

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1
```

Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 3: Create DM placeholder page**

Since the DM tab in the bottom nav links to `/dm`, create a placeholder:

`src/app/dm/page.js`:
```js
"use client";
import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

export default function DmPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.emailVerified) router.push("/verify");
    if (!loading && user?.emailVerified && profile && !profile.username) router.push("/setup-username");
  }, [user, profile, loading, router]);

  if (loading || !user) return null;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 300, fontStyle: "italic", fontSize: 28, marginBottom: 24 }}>
        dms
      </h1>
      <p style={{ fontSize: 12, color: "var(--muted2)", padding: 40, textAlign: "center" }}>
        dms coming in phase 4
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Commit DM placeholder**

```bash
git add src/app/dm/page.js
git commit -m "feat: dm placeholder page"
```

- [ ] **Step 5: Rebuild and commit any fixes**

```bash
npm run build && npm run lint
```

- [ ] **Step 6: Final commit + push**

```bash
git push
```

---

## Spec coverage check

- Auth with email verification ✓ (Tasks 2-4)
- Unique usernames ✓ (Tasks 1, 4)
- Group CRUD ✓ (Tasks 1, 7)
- Browse/join groups ✓ (Tasks 6, 7)
- Invite system ✓ (Task 8)
- Bottom nav ✓ (Task 5)
- Profile page ✓ (Task 9)
- Group interior with sub-nav ✓ (Task 7)
- Visual direction (warm palette, grain, DM Mono + Fraunces) — already set up in previous visual refresh
