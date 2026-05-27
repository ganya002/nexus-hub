# nexus — app design spec

## overview

A platform where friend groups create private hubs with custom spaces — chat, links, voice. Each group is isolated. Users have unique usernames and email-verified accounts.

---

## architecture

**Stack:** Next.js 14 (App Router) + Firebase Auth + Firestore  
**Deploy:** Vercel (already set up)  
**Cost:** Firebase free tier (Spark plan) — auth 50k/month, Firestore 1GiB stored, 50k reads/day, 20k writes/day

### data model

```
users/{uid}
  ├── username: string        (unique, @handle)
  ├── displayName: string
  ├── email: string
  ├── photoURL: string | null
  ├── emailVerified: boolean
  └── createdAt: timestamp

usernames/{username}          (doc exists = taken)
  └── uid: string

groups/{groupId}
  ├── name: string
  ├── description: string
  ├── category: string
  ├── photoURL: string | null
  ├── memberCount: number
  ├── createdAt: timestamp
  └── createdBy: string       (uid)

groups/{groupId}/members/{uid}
  ├── role: "owner" | "admin" | "member"
  ├── joinedAt: timestamp
  └── displayName: string     (snapshot at join)

groups/{groupId}/channels/{channelId}
  ├── name: string             (default "general")
  ├── type: "text" | "voice"
  └── createdAt: timestamp

groups/{groupId}/channels/{channelId}/messages/{msgId}
  ├── uid: string
  ├── displayName: string
  ├── text: string
  ├── createdAt: timestamp
  └── editedAt: timestamp | null

groups/{groupId}/links/{linkId}
  ├── uid: string
  ├── url: string
  ├── title: string
  ├── note: string | null
  ├── createdAt: timestamp
  └── favicon: string | null

invites/{inviteCode}
  ├── groupId: string
  ├── createdBy: string
  ├── expiresAt: timestamp    (firestore TTL)
  └── uses: number

dms/{dmId}                    (composite key: sorted uids joined by _)
  ├── participants: [uid, uid]
  ├── lastMessage: string | null
  ├── lastMessageAt: timestamp | null
  └── createdAt: timestamp

dms/{dmId}/messages/{msgId}
  ├── uid: string
  ├── text: string
  ├── createdAt: timestamp
  └── readBy: [uid, ...]
```

### firestore indexes needed

- `messages` by `channelId` + `createdAt` desc
- `links` by `groupId` + `createdAt` desc
- `groups` by `memberCount` desc (trending)
- `groups` by `category` + `memberCount` desc

---

## pages & routes

### global layout
Bottom nav bar on all logged-in pages: **Home** | **DMs** | **Groups** | **Profile**

### /
Landing page. If logged out: hero + sign-up prompt. If logged in: redirects to /home.

### /home
Discover public groups. Tab bar: **Trending** (default) | categories list. Search bar at top.

### /profile
Edit display name, profile photo. Settings section. Sign out button.

### /dm
List of DM conversations ordered by last message time. Each shows other person's name + last message preview. Click to open.

### /dm/[userId]
Real-time conversation. Message input at bottom. Messages scroll up.

### /groups
Two tabs: **Your Groups** | **Discover**

### /groups/create
Form: name, description, category, optional photo.

### /groups/[id]
Inside a group. Bottom sub-nav: **Chat** | **Links** | **Voice**

### /groups/[id]/chat/[channelId]
Real-time chat. Messages load most recent 50, "load older" button. Click a message to reply (optional).

### /groups/[id]/links
Shared link wall. Form to submit url + title + note. Sorted newest first.

### /groups/[id]/voice
Voice channel list. Click to join. See who's in the channel. Mute/unmute.

### /join/[code]
Invite link landing page. Shows group name, member count. Click "Join" if logged in (and verified). Shows error if expired.

### /signup
Email + password form. After submit, send verification email. Prompt user to verify before continuing.

### /login
Email + password.

---

## auth flow

1. User signs up with email + password
2. Firebase sends verification email
3. User verifies → redirected to **username setup** page
4. User picks unique username (checked against `usernames/` collection)
5. Congrats — now they can browse/join/create groups

**Before verification**, user can only see the landing page and their profile. Redirect to `/verify` on any protected route.

---

## group membership

- Creator becomes **owner** (role: "owner")
- Owner can promote members to **admin**
- Admin can invite, remove members, edit group info
- Owner can delete the group
- Members can leave freely

---

## invite system

- Owner/admin creates invite: pick expiration (24h / 7d / 30d / never)
- Server generates 6-char alphanumeric code
- Link: `/join/{code}`
- On use: check `expiresAt`, increment `uses`
- Invite page shows group preview + join button

---

## build phases

### Phase 1 — foundation
- Enhanced auth (email verification, unique usernames)
- User profiles + settings
- Group CRUD (create, edit, delete, browse, join/leave)
- Invite system
- Group interior layout with bottom sub-nav

### Phase 2 — chat space
- Real-time messaging with Firestore listeners
- Channels (default "general" + create more)
- Message input, display name + avatar per message
- "Load older" pagination

### Phase 3 — links space
- Link submission (url + title + optional note)
- Sorted by newest
- Basic favicon scrape from URL

### Phase 4 — DMs
- DM creation from user profile
- Real-time conversation view
- DM list sidebar

### Phase 5 — voice calls
- WebRTC peer-to-peer
- Firestore signaling
- Mute/unmute, participant list

### Phase 6 — polish
- Gallery, todo, events, polls spaces
- Notifications
- Mobile responsiveness pass
