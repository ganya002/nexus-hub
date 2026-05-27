import {
  doc, setDoc, deleteDoc, getDocs,
  collection, query, onSnapshot, serverTimestamp,
  addDoc,
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
  const ref = collection(db, "groups", groupId, "channels", channelId, "participants");
  return onSnapshot(ref, (snap) => {
    const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    onParticipants(list);
  });
}

// ── signaling ──
// Data model:
//   signaling/{uid}/offers/{fromUid}  — doc (8 segments)
//   signaling/{uid}/answers/{fromUid} — doc (8 segments)
//   signaling/{uid}/ice/{autoId}      — doc (7 segments)
// All paths have odd segment counts = valid collection refs

function signalingColl(groupId, channelId) {
  return collection(db, "groups", groupId, "channels", channelId, "signaling");
}

export async function sendOffer(groupId, channelId, fromUid, toUid, sdp) {
  await setDoc(doc(signalingColl(groupId, channelId), toUid, "offers", fromUid), { sdp });
}

export async function sendAnswer(groupId, channelId, fromUid, toUid, sdp) {
  await setDoc(doc(signalingColl(groupId, channelId), toUid, "answers", fromUid), { sdp });
}

export async function sendIceCandidate(groupId, channelId, fromUid, toUid, candidate) {
  if (!candidate || !candidate.candidate) return;
  await addDoc(collection(signalingColl(groupId, channelId), toUid, "ice"), {
    fromUid,
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid || "",
    sdpMLineIndex: candidate.sdpMLineIndex ?? 0,
  });
}

export function subscribeOffers(groupId, channelId, uid, onOffer) {
  const ref = collection(signalingColl(groupId, channelId), uid, "offers");
  return onSnapshot(ref, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        onOffer(change.doc.id, change.doc.data().sdp);
      }
    });
  });
}

export function subscribeAnswers(groupId, channelId, uid, onAnswer) {
  const ref = collection(signalingColl(groupId, channelId), uid, "answers");
  return onSnapshot(ref, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        onAnswer(change.doc.id, change.doc.data().sdp);
      }
    });
  });
}

export function subscribeIceCandidates(groupId, channelId, uid, onIce) {
  const ref = collection(signalingColl(groupId, channelId), uid, "ice");
  return onSnapshot(ref, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        onIce(change.doc.data().fromUid, change.doc.data());
      }
    });
  });
}

async function cleanupSignaling(groupId, channelId, uid) {
  for (const subcol of ["offers", "answers", "ice"]) {
    const ref = collection(signalingColl(groupId, channelId), uid, subcol);
    const snap = await getDocs(ref);
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
