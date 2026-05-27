# Phase 5 — Voice Calls Implementation Plan

**Goal:** WebRTC peer-to-peer voice channels per group with Firestore signaling, mute/unmute, and participant list.

**Tech Stack:** Next.js 14, Firestore signaling, WebRTC (RTCPeerConnection, getUserMedia)

---

## File Structure

### New files:
- `src/lib/voice.js` — WebRTC + Firestore signaling helpers

### Files to modify:
- `src/app/groups/[id]/voice/page.js` — real voice channel UI

---

## Tasks

### Task 1: Create voice lib with WebRTC + signaling

**Files:**
- Create: `src/lib/voice.js`

### Task 2: Build voice channel UI

**Files:**
- Modify: `src/app/groups/[id]/voice/page.js`

### Task 3: Verify build
