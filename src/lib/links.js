import {
  collection, addDoc, getDocs,
  query, orderBy, limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const LINK_LIMIT = 50;

export async function addLink(groupId, uid, url, title, note = "") {
  let hostname = "";
  try { hostname = new URL(url).hostname.replace("www.", ""); } catch {}
  const ref = await addDoc(collection(db, "groups", groupId, "links"), {
    uid,
    url,
    title,
    note,
    hostname,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getLinks(groupId) {
  const q = query(
    collection(db, "groups", groupId, "links"),
    orderBy("createdAt", "desc"),
    limit(LINK_LIMIT)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
