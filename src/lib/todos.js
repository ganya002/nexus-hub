import {
  collection, addDoc, getDocs,
  query, orderBy, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function addTodo(groupId, uid, text) {
  const ref = await addDoc(collection(db, "groups", groupId, "todos"), {
    uid,
    text,
    done: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTodos(groupId) {
  const q = query(
    collection(db, "groups", groupId, "todos"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function toggleTodo(groupId, todoId, done) {
  await updateDoc(doc(db, "groups", groupId, "todos", todoId), { done });
}

export async function deleteTodo(groupId, todoId) {
  await deleteDoc(doc(db, "groups", groupId, "todos", todoId));
}
