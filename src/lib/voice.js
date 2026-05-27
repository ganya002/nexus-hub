import {
  doc, setDoc, deleteDoc, getDoc, getDocs,
  collection, query, onSnapshot, serverTimestamp,
  addDoc, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ── participant management ──

export async function joinChannel(groupId, channelId, uid) {
  await setDoc(doc(db, "groups", groupId, "channels", channelId, "participants", uid), {
    joinedAt: serverTimestamp(),
  });
}

export async function leaveChannel(groupId, channelId, uid) {
  await deleteDoc(doc(db, "groups", groupId, "channels", channelId, "participants", uid));
  await cleanupSignaling(groupId, channelId, uid);
}

export function subscribeParticipants(groupId, channelId, onParticipants) {
  const q = query(collection(db, "groups", groupId, "channels", channelId, "participants"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    onParticipants(list);
  });
}

// ── signaling ──

function signalingRef(groupId, channelId, uid) {
  return collection(db, "groups", groupId, "channels", channelId, "signaling", uid);
}

export async function sendOffer(groupId, channelId, fromUid, toUid, sdp) {
  await setDoc(doc(signalingRef(groupId, channelId, toUid), "offers", fromUid), { sdp });
}

export async function sendAnswer(groupId, channelId, fromUid, toUid, sdp) {
  await setDoc(doc(signalingRef(groupId, channelId, toUid), "answers", fromUid), { sdp });
}

export async function sendIceCandidate(groupId, channelId, fromUid, toUid, candidate) {
  await addDoc(collection(signalingRef(groupId, channelId, toUid), "ice"), {
    fromUid,
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
  });
}

export function subscribeIceCandidates(groupId, channelId, uid, onIce) {
  const q = query(collection(signalingRef(groupId, channelId, uid), "ice"));
  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        onIce(change.doc.data().fromUid, change.doc.data());
      }
    });
  });
}

export function subscribeOffers(groupId, channelId, uid, onOffer) {
  const q = query(collection(signalingRef(groupId, channelId, uid), "offers"));
  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        onOffer(change.doc.id, change.doc.data().sdp);
      }
    });
  });
}

export function subscribeAnswers(groupId, channelId, uid, onAnswer) {
  const q = query(collection(signalingRef(groupId, channelId, uid), "answers"));
  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        onAnswer(change.doc.id, change.doc.data().sdp);
      }
    });
  });
}

async function cleanupSignaling(groupId, channelId, uid) {
  const ref = signalingRef(groupId, channelId, uid);
  for (const subcol of ["offers", "answers", "ice"]) {
    const snap = await getDocs(collection(ref, subcol));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  }
}

// ── WebRTC management ──

export async function startLocalStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch {
    return null;
  }
}

export function stopLocalStream(stream) {
  stream?.getTracks().forEach(t => t.stop());
}

export function createPeerConnection(remoteUid, onIceCandidate, onRemoteStream, onConnectionState) {
  const pc = new RTCPeerConnection(RTC_CONFIG);

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      onIceCandidate(remoteUid, e.candidate);
    }
  };

  pc.ontrack = (e) => {
    onRemoteStream(remoteUid, e.streams[0]);
  };

  pc.onconnectionstatechange = () => {
    onConnectionState?.(remoteUid, pc.connectionState);
  };

  return pc;
}

export async function createOffer(pc) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer.sdp;
}

export async function handleOffer(pc, sdp) {
  await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer.sdp;
}

export async function handleAnswer(pc, sdp) {
  await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
}

export async function handleIceCandidate(pc, candidate) {
  if (candidate && candidate.candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {}
  }
}
