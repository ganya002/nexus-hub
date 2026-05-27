"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuth, getMembers } from "@/lib/firebase";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    return onAuth(async (u) => {
      setUser(u);
      if (u) {
        const m = await getMembers();
        setMembers(m);
      }
    });
  }, []);

  async function refreshMembers() {
    const m = await getMembers();
    setMembers(m);
  }

  return (
    <Ctx.Provider value={{ user, members, refreshMembers }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
