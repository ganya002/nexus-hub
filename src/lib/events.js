import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function createEvent(groupId, uid, title, description, date, location) {
  const ref = await addDoc(collection(db, "groups", groupId, "events"), {
    uid,
    title,
    description,
    date,
    location,
    rsvps: {},
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getEvents(groupId) {
  const q = query(
    collection(db, "groups", groupId, "events"),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateEvent(groupId, eventId, data) {
  await updateDoc(doc(db, "groups", groupId, "events", eventId), data);
}

export async function deleteEvent(groupId, eventId) {
  await deleteDoc(doc(db, "groups", groupId, "events", eventId));
}

export async function setRsvp(groupId, eventId, uid, status) {
  await updateDoc(doc(db, "groups", groupId, "events", eventId), {
    [`rsvps.${uid}`]: status,
  });
}
