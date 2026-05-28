import {
  collection, addDoc, getDocs,
  query, where, orderBy, limit,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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

const UPLOAD_URL = process.env.NEXT_PUBLIC_UPLOAD_URL || "https://stale-otters-melt.loca.lt";
const UPLOAD_KEY = process.env.NEXT_PUBLIC_UPLOAD_KEY || "test123";

export async function uploadMedia(file, groupId, channelId, onProgress) {
  const formData = new FormData();
  formData.append("files", file);

  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.files[0]);
      } else {
        reject(new Error("upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("upload failed"));
    xhr.open("POST", `${UPLOAD_URL}/upload`);
    xhr.setRequestHeader("x-api-key", UPLOAD_KEY);
    xhr.send(formData);
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
