import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, orderBy, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function createPoll(groupId, uid, question, options) {
  const ref = await addDoc(collection(db, "groups", groupId, "polls"), {
    uid,
    question,
    options,
    votes: {},
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPolls(groupId) {
  const q = query(
    collection(db, "groups", groupId, "polls"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function votePoll(groupId, pollId, uid, optionIndex) {
  await updateDoc(doc(db, "groups", groupId, "polls", pollId), {
    [`votes.${uid}`]: optionIndex,
  });
}

export async function deletePoll(groupId, pollId) {
  await deleteDoc(doc(db, "groups", groupId, "polls", pollId));
}
