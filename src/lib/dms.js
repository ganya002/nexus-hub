import {
  collection, addDoc, getDocs, doc, getDoc, query,
  where, orderBy, limit, onSnapshot, serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const MESSAGE_LIMIT = 50;

export async function getOrCreateDM(uid1, uid2) {
  const q = query(
    collection(db, "dms"),
    where("participants", "array-contains", uid1)
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find(d => {
    const p = d.data().participants || [];
    return p.includes(uid1) && p.includes(uid2);
  });
  if (existing) return { id: existing.id, ...existing.data() };

  const ref = await addDoc(collection(db, "dms"), {
    participants: [uid1, uid2],
    lastMessage: null,
    lastMessageAt: null,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, participants: [uid1, uid2], lastMessage: null, lastMessageAt: null };
}

export async function getUserDMs(uid) {
  const q = query(
    collection(db, "dms"),
    where("participants", "array-contains", uid),
    orderBy("lastMessageAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeDMMessages(dmId, onMessages) {
  const q = query(
    collection(db, "dms", dmId, "messages"),
    orderBy("createdAt", "desc"),
    limit(MESSAGE_LIMIT)
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .reverse();
    onMessages(msgs);
  });
}

export async function sendDMMessage(dmId, uid, text, media = []) {
  const ref = await addDoc(
    collection(db, "dms", dmId, "messages"),
    { uid, text, media, createdAt: serverTimestamp() }
  );
  const preview = media.length > 0 ? (text || (media[0].type === "video" ? "📹 video" : "📷 photo")) : text;
  await updateDoc(doc(db, "dms", dmId), {
    lastMessage: preview,
    lastMessageAt: serverTimestamp(),
  });
  return ref.id;
}

export async function loadOlderDMMessages(dmId, before) {
  const q = query(
    collection(db, "dms", dmId, "messages"),
    orderBy("createdAt", "desc"),
    where("createdAt", "<", before),
    limit(MESSAGE_LIMIT)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .reverse();
}

export async function searchUsers(queryStr) {
  const snap = await getDocs(collection(db, "users"));
  const q = queryStr.toLowerCase();
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() }))
    .filter(u =>
      u.displayName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    )
    .slice(0, 20);
}

export async function getProfilesBatch(uids) {
  const results = await Promise.all(
    uids.map(uid => getDoc(doc(db, "users", uid)).then(s => s.exists() ? { uid, ...s.data() } : null))
  );
  return results.filter(Boolean);
}
