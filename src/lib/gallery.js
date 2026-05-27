import {
  collection, addDoc, getDocs,
  query, orderBy, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function addImage(groupId, uid, url, caption = "") {
  const ref = await addDoc(collection(db, "groups", groupId, "gallery"), {
    uid,
    url,
    caption,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getImages(groupId) {
  const q = query(
    collection(db, "groups", groupId, "gallery"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteImage(groupId, imageId) {
  await deleteDoc(doc(db, "groups", groupId, "gallery", imageId));
}
