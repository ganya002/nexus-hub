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

  async function handleResend() {
    setLoading(true);
    try {
      const { sendEmailVerification: send } = await import("@/lib/firebase");
      const { auth } = await import("@/lib/firebase");
      if (auth.currentUser) await send(auth.currentUser);
    } catch {}
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!displayName.trim()) { setError("need a name"); setLoading(false); return; }
        const user = await signUp(email, password, displayName.trim());
        try { await sendEmailVerification(user); } catch {}
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
          <p className={styles.sentText}>
            we sent a verification link to <strong className={styles.sentEmail}>{email}</strong>.
          </p>
          <p className={styles.sentHint}>
            didn&apos;t get it?{` `}
            <button onClick={handleResend} className={styles.resendBtn}>
              resend
            </button>
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
