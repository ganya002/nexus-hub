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
      try {
        if (u) {
          const { getUserProfile } = await import("@/lib/firebase");
          const p = await getUserProfile(u.uid);
          setProfile(p);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("auth callback error:", err);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function refreshProfile() {
    if (!user) return;
    try {
      const { getUserProfile } = await import("@/lib/firebase");
      const p = await getUserProfile(user.uid);
      setProfile(p);
    } catch (err) {
      console.error("refreshProfile error:", err);
    }
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
