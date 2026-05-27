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
        <button onClick={resend} style={{
          background: "none", border: "none", color: "var(--accent)", cursor: "pointer",
          fontFamily: "var(--mono)", fontSize: 12, textDecoration: "underline",
        }}>
          {resent ? "sent!" : "resend"}
        </button>
      </p>
    </main>
  );
}
