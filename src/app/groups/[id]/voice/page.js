"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams } from "next/navigation";
import { getChannels, createChannel } from "@/lib/chat";
import { getUserProfile } from "@/lib/firebase";
import {
  joinChannel, leaveChannel, subscribeParticipants,
  sendOffer, sendAnswer, sendIceCandidate,
  subscribeOffers, subscribeAnswers, subscribeIceCandidates,
  startLocalStream, stopLocalStream,
  createPeerConnection, createOffer, handleOffer, handleAnswer, handleIceCandidate,
} from "@/lib/voice";

export default function VoicePage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [channels, setChannels] = useState([]);
  const [joinedChannel, setJoinedChannel] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [muted, setMuted] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef({});
  const audioElementsRef = useRef({});
  const connectedUidsRef = useRef(new Set());

  useEffect(() => {
    getChannels(id).then(all => setChannels(all.filter(c => c.type === "voice")));
  }, [id]);

  useEffect(() => {
    if (participants.length === 0) { setProfiles({}); return; }
    Promise.all(
      participants.map(p => getUserProfile(p.uid).then(u => ({ uid: p.uid, ...u })))
    ).then(list => {
      setProfiles(Object.fromEntries(list.map(p => [p.uid, p])));
    });
  }, [participants]);

  useEffect(() => {
    if (!joinedChannel) return;
    const unsub = subscribeParticipants(id, joinedChannel, setParticipants);
    return () => unsub();
  }, [id, joinedChannel]);

  async function handleJoin(channelId) {
    if (!user) return;
    const stream = await startLocalStream();
    if (!stream) { alert("could not access microphone"); return; }
    localStreamRef.current = stream;
    setMuted(false);
    setJoinedChannel(channelId);
    await joinChannel(id, channelId, user.uid);
  }

  function connectToPeer(remoteUid, channelId) {
    if (peerConnectionsRef.current[remoteUid]) return peerConnectionsRef.current[remoteUid];
    const pc = createPeerConnection(
      remoteUid,
      (uid, candidate) => sendIceCandidate(id, channelId, user.uid, uid, candidate),
      (uid, stream) => {
        remoteStreamsRef.current[uid] = stream;
        if (audioElementsRef.current[uid]) {
          audioElementsRef.current[uid].srcObject = stream;
        }
      },
      (uid, state) => {
        if (state === "disconnected" || state === "failed" || state === "closed") {
          delete peerConnectionsRef.current[uid];
          delete remoteStreamsRef.current[uid];
          connectedUidsRef.current.delete(uid);
        }
      }
    );
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    peerConnectionsRef.current[remoteUid] = pc;
    connectedUidsRef.current.add(remoteUid);
    return pc;
  }

  // signaling subscriptions — stable, only depends on join state
  useEffect(() => {
    if (!joinedChannel || !user) return;
    const channelId = joinedChannel;

    const unsubOffers = subscribeOffers(id, channelId, user.uid, async (fromUid, sdp) => {
      if (connectedUidsRef.current.has(fromUid)) return;
      const pc = connectToPeer(fromUid, channelId);
      if (pc && !pc.localDescription) {
        const answerSdp = await handleOffer(pc, sdp);
        await sendAnswer(id, channelId, user.uid, fromUid, answerSdp);
      }
    });

    const unsubAnswers = subscribeAnswers(id, channelId, user.uid, async (fromUid, sdp) => {
      const pc = peerConnectionsRef.current[fromUid];
      if (pc) await handleAnswer(pc, sdp);
    });

    const unsubIce = subscribeIceCandidates(id, channelId, user.uid, (fromUid, candidate) => {
      const pc = peerConnectionsRef.current[fromUid];
      if (pc) handleIceCandidate(pc, candidate);
    });

    return () => {
      unsubOffers();
      unsubAnswers();
      unsubIce();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, joinedChannel, user]);

  // connect to new participants when they join — no signaling re-subscription
  useEffect(() => {
    if (!joinedChannel || !user) return;
    const channelId = joinedChannel;

    participants
      .filter(p => p.uid !== user.uid && !connectedUidsRef.current.has(p.uid))
      .forEach(p => {
        const pc = connectToPeer(p.uid, channelId);
        if (pc && !pc.localDescription) {
          createOffer(pc).then(sdp => sendOffer(id, channelId, user.uid, p.uid, sdp));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, joinedChannel, participants, user]);

  async function handleLeave() {
    if (!joinedChannel || !user) return;
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    remoteStreamsRef.current = {};
    audioElementsRef.current = {};
    stopLocalStream(localStreamRef.current);
    localStreamRef.current = null;
    await leaveChannel(id, joinedChannel, user.uid);
    setJoinedChannel(null);
    setParticipants([]);
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    const enabled = !muted;
    localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = !enabled));
    setMuted(enabled);
  }

  async function handleCreateVoiceChannel() {
    if (!newName.trim()) return;
    await createChannel(id, newName.trim(), "voice");
    setNewName("");
    setShowNew(false);
    const updated = await getChannels(id);
    setChannels(updated.filter(c => c.type === "voice"));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {'// voice channels'}
        </p>
        <button onClick={() => setShowNew(!showNew)} style={{
          fontSize: 11, color: "var(--muted)", cursor: "pointer",
          background: "none", border: "none", fontFamily: "var(--mono)",
        }}>
          {showNew ? "cancel" : "+ new"}
        </button>
      </div>

      {showNew && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="channel name" autoFocus
            onKeyDown={e => e.key === "Enter" && handleCreateVoiceChannel()}
            style={{
              flex: 1, background: "var(--bg3)", border: "1px solid var(--border)",
              color: "var(--text)", padding: "6px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none",
            }}
          />
          <button onClick={handleCreateVoiceChannel} style={{
            fontSize: 11, padding: "6px 10px", border: "1px solid var(--border)",
            color: "var(--text)", cursor: "pointer", background: "var(--bg3)", fontFamily: "var(--mono)",
          }}>
            create
          </button>
        </div>
      )}

      {joinedChannel ? (
        <div style={{ padding: 20, border: "1px solid var(--border)", background: "var(--bg2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 14, color: "var(--text)" }}>♪ {channels.find(c => c.id === joinedChannel)?.name || "channel"}</span>
              <span style={{ fontSize: 10, color: "var(--accent)", marginLeft: 8 }}>connected</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={toggleMute} style={{
                fontSize: 11, padding: "6px 12px", border: "1px solid var(--border)",
                color: muted ? "var(--danger)" : "var(--muted)",
                cursor: "pointer", background: muted ? "var(--border)" : "none",
                fontFamily: "var(--mono)",
              }}>
                {muted ? "unmute" : "mute"}
              </button>
              <button onClick={handleLeave} style={{
                fontSize: 11, padding: "6px 12px", border: "1px solid var(--danger)",
                color: "var(--danger)", cursor: "pointer", background: "none",
                fontFamily: "var(--mono)",
              }}>
                leave
              </button>
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em" }}>
            {'// participants'}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {participants.map(p => {
              const isMe = p.uid === user?.uid;
              const prof = profiles[p.uid];
              return (
                <div key={p.uid} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", border: "1px solid var(--border)",
                  background: isMe ? "var(--bg3)" : "var(--bg)",
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: isMe ? "var(--accent)" : "#4ade80",
                  }} />
                  <span style={{ fontSize: 12, color: "var(--text)" }}>
                    {prof?.displayName || "..."}{isMe ? " (you)" : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {participants.filter(p => p.uid !== user?.uid).map(p => (
            <audio
              key={p.uid}
              ref={el => { if (el) { audioElementsRef.current[p.uid] = el; if (remoteStreamsRef.current[p.uid]) el.srcObject = remoteStreamsRef.current[p.uid]; } }}
              autoPlay
              style={{ display: "none" }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
          {channels.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--muted2)", padding: 40, textAlign: "center" }}>
              no voice channels yet
            </p>
          )}
          {channels.map(ch => (
            <div key={ch.id} style={{
              padding: "16px", background: "var(--bg)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <span style={{ fontSize: 13, color: "var(--text)", display: "block", marginBottom: 2 }}>♪ {ch.name}</span>
              </div>
              <button onClick={() => handleJoin(ch.id)} style={{
                fontSize: 11, padding: "5px 10px", border: "1px solid var(--accent)",
                color: "var(--accent)", cursor: "pointer", background: "none",
                fontFamily: "var(--mono)",
              }}>
                join
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
