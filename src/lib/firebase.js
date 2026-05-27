import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, getDocs,
  collection, collectionGroup, query, where, orderBy, limit,
  serverTimestamp, increment, arrayUnion, arrayRemove, runTransaction,
  deleteDoc, updateDoc, addDoc, onSnapshot,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export { sendEmailVerification };

export async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    displayName,
    email,
    joinedAt: new Date().toISOString(),
  });
  return cred.user;
}

export async function logIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut() {
  await signOut(auth);
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

// ── users ──

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), {
    ...data,
    photoURL: null,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}

export async function reserveUsername(username, uid) {
  const ref = doc(db, "usernames", username.toLowerCase());
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (snap.exists()) throw new Error("username taken");
    transaction.set(ref, { uid });
  });
}

// ── groups ──

export async function createGroup(data) {
  const ref = doc(collection(db, "groups"));
  await setDoc(ref, {
    ...data,
    memberCount: 1,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getGroup(id) {
  const snap = await getDoc(doc(db, "groups", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getGroupsByCategory(category = null, limitCount = 20) {
  const constraints = [orderBy("memberCount", "desc"), limit(limitCount)];
  if (category) constraints.unshift(where("category", "==", category));
  const snap = await getDocs(query(collection(db, "groups"), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addMember(groupId, uid, displayName, role = "member") {
  await setDoc(doc(db, "groups", groupId, "members", uid), {
    role,
    displayName,
    joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "groups", groupId), {
    memberCount: increment(1),
  });
  await updateDoc(doc(db, "users", uid), {
    groupIds: arrayUnion(groupId),
  });
}

export async function removeMember(groupId, uid) {
  await deleteDoc(doc(db, "groups", groupId, "members", uid));
  await updateDoc(doc(db, "groups", groupId), {
    memberCount: increment(-1),
  });
  await updateDoc(doc(db, "users", uid), {
    groupIds: arrayRemove(groupId),
  });
}

export async function getMembers(groupId) {
  const snap = await getDocs(collection(db, "groups", groupId, "members"));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function getUserGroups(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return [];
  const groupIds = userSnap.data().groupIds || [];
  if (groupIds.length === 0) return [];
  const groups = await Promise.all(
    groupIds.map(id => getGroup(id))
  );
  return groups.filter(Boolean);
}

// ── invites ──

export async function createInvite(groupId, createdBy, expiresAt) {
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  await setDoc(doc(db, "invites", code), {
    groupId,
    createdBy,
    expiresAt,
    uses: 0,
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function getInvite(code) {
  const snap = await getDoc(doc(db, "invites", code.toUpperCase()));
  return snap.exists() ? { code: snap.id, ...snap.data() } : null;
}

export async function useInvite(code) {
  const ref = doc(db, "invites", code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("invite not found");
  const data = snap.data();
  if (data.expiresAt?.toMillis?.() < Date.now()) throw new Error("invite has expired");
  await updateDoc(ref, { uses: increment(1) });
}
