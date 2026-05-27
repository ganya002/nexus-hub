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
        }}>
          join the group →
        </button>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
