"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { getGroup } from "@/lib/firebase";
import { getChannels } from "@/lib/chat";

export default function ChatSelector() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    getChannels(id).then(all => {
      const text = all.filter(c => c.type !== "voice");
      if (text.length > 0) {
        router.replace(`/groups/${id}/chat/${text[0].id}`);
      } else {
        setChannels([]);
      }
    });
  }, [id, router]);

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
        no text channels yet
      </p>
    </div>
  );
}
