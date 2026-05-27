import {
  collection, addDoc, getDocs,
  query, where, orderBy, limit,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db, storage, ref, uploadBytesResumable, getDownloadURL } from "@/lib/firebase";

const MESSAGE_LIMIT = 50;

export async function createChannel(groupId, name, type = "text") {
  const ref = await addDoc(collection(db, "groups", groupId, "channels"), {
    name,
    type,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getChannels(groupId) {
  const snap = await getDocs(
    query(collection(db, "groups", groupId, "channels"), orderBy("createdAt"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function sendMessage(groupId, channelId, uid, displayName, text, media = []) {
  const ref = await addDoc(
    collection(db, "groups", groupId, "channels", channelId, "messages"),
    { uid, displayName, text, media, createdAt: serverTimestamp() }
  );
  return ref.id;
}

export function uploadMedia(file, groupId, channelId, onProgress) {
  const path = `chat-media/${groupId}/${channelId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    task.on("state_changed",
      (snap) => onProgress?.(snap.bytesTransferred / snap.totalBytes),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        const type = file.type.startsWith("video/") ? "video" : "image";
        resolve({ url, type, name: file.name });
      }
    );
  });
}

export function subscribeMessages(groupId, channelId, onMessages) {
  const q = query(
    collection(db, "groups", groupId, "channels", channelId, "messages"),
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

export async function loadOlderMessages(groupId, channelId, before) {
  const q = query(
    collection(db, "groups", groupId, "channels", channelId, "messages"),
    orderBy("createdAt", "desc"),
    where("createdAt", "<", before),
    limit(MESSAGE_LIMIT)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .reverse();
}
