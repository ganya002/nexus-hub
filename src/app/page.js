"use client";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { logOut } from "@/lib/firebase";
import AuthModal from "@/components/AuthModal";
import styles from "./page.module.css";

const SITES = [
  { slug: "void", label: "the void", desc: "links, drops, and stuff we've been rotating.", tag: "ongoing" },
  { slug: "projects", label: "projects", desc: "things we built. half-finished counts.", tag: "building" },
  { slug: "gallery", label: "gallery", desc: "art and renders that didn't go in the bin.", tag: "creative" },
  { slug: "playlist", label: "playlist wars", desc: "weekly submissions. community votes. one winner.", tag: "every friday" },
];

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Home() {
  const { user, members } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <main className={styles.main}>
      <nav className={styles.nav}>
        <span className={styles.wordmark}>nexus</span>
        <div className={styles.navRight}>
          {user ? (
            <>
              <span className={styles.navUser}>{user.displayName}</span>
              <button className={styles.navBtn} onClick={logOut}>log out</button>
            </>
          ) : (
            <button className={styles.navBtn} onClick={() => setShowAuth(true)}>
              log in / sign up
            </button>
          )}
        </div>
      </nav>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>// our little corner</p>
        <h1 className={styles.title}>
          nexus
        </h1>
        <p className={styles.sub}>
          {members.length > 0
            ? `${members.length} member${members.length !== 1 ? "s" : ""} and counting.`
            : "a hub for the group. join to show up."}
        </p>
      </section>

      {members.length > 0 && (
        <section className={styles.members}>
          <p className={styles.sectionLabel}>// members</p>
          <div className={styles.bubbles}>
            {members.map((m) => (
              <div key={m.uid} className={styles.bubble} title={m.displayName}>
                <div className={styles.avatar}>{initials(m.displayName)}</div>
                <span className={styles.bubbleName}>{m.displayName}</span>
              </div>
            ))}
            {!user && (
              <button className={styles.joinBubble} onClick={() => setShowAuth(true)}>
                + join
              </button>
            )}
          </div>
        </section>
      )}

      <section className={styles.sites}>
        <p className={styles.sectionLabel}>// spaces</p>
        <div className={styles.grid}>
          {SITES.map((s) => (
            <a key={s.slug} href={`/${s.slug}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardLabel}>{s.label}</span>
                <span className={styles.cardTag}>{s.tag}</span>
              </div>
              <p className={styles.cardDesc}>{s.desc}</p>
              <span className={styles.cardArrow}>→</span>
            </a>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <span>nexus · private</span>
        {!user && (
          <button className={styles.footerJoin} onClick={() => setShowAuth(true)}>
            join the group →
          </button>
        )}
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
