import {
  collection, addDoc, getDocs, updateDoc, doc,
  query, orderBy, where, limit, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db, getMembers } from "@/lib/firebase";

export async function createNotification(uid, notif) {
  await addDoc(collection(db, "users", uid, "notifications"), {
    ...notif,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function getNotifications(uid) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeNotifications(uid, cb) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

export async function markRead(uid, notifId) {
  await updateDoc(doc(db, "users", uid, "notifications", notifId), { read: true });
}

export async function markAllRead(uid) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
}

export async function notifyGroup(groupId, excludeUid, notif) {
  const members = await getMembers(groupId);
  await Promise.all(
    members
      .filter(m => m.uid !== excludeUid)
      .map(m => createNotification(m.uid, notif))
  );
}
