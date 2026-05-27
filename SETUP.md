# nexus — setup guide

## what you need
- Node.js installed (https://nodejs.org)
- A Firebase account (free) — https://console.firebase.google.com
- A Vercel account (free) — https://vercel.com
- A GitHub account to connect everything

---

## step 1 — firebase setup

1. Go to https://console.firebase.google.com
2. Click **Add project**, name it `nexus-hub`, skip Google Analytics
3. Once created, click the **web icon** (</>), register the app as `nexus`
4. Copy the `firebaseConfig` values — you'll need them in step 3

**Enable Auth:**
- In the left sidebar → **Authentication** → **Get started**
- Click **Email/Password** → enable it → Save

**Enable Firestore:**
- In the left sidebar → **Firestore Database** → **Create database**
- Start in **test mode** (you can add rules later)
- Pick any region → Done

---

## step 2 — local setup

```bash
# clone or unzip the project, then:
cd nexus
npm install

# copy the env file
cp .env.local.example .env.local
```

Open `.env.local` and paste your Firebase values from step 1.

```bash
npm run dev
```

Open http://localhost:3000 — it should work.

---

## step 3 — deploy to Vercel

1. Push the project to a GitHub repo
   ```bash
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/YOUR_USERNAME/nexus-hub.git
   git push -u origin main
   ```

2. Go to https://vercel.com → **Add New Project** → import your GitHub repo

3. Before deploying, add your environment variables:
   - In Vercel project settings → **Environment Variables**
   - Add all 6 values from your `.env.local` file

4. Click **Deploy** — done.

---

## firestore security rules (do this before going public)

In Firebase Console → Firestore → Rules, replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

This means: logged-in users can read the members list, but can only write their own profile.

---

## adding more mini-sites

Edit `src/app/page.js` → find the `SITES` array → add entries:

```js
{ slug: "yourpage", label: "your page name", desc: "short description.", tag: "some tag" }
```

Then create `src/app/yourpage/page.js` for the actual page.

---

## folder structure

```
nexus/
├── src/
│   ├── app/
│   │   ├── globals.css       ← global styles
│   │   ├── layout.js         ← root layout + auth provider
│   │   ├── page.js           ← main hub
│   │   └── page.module.css   ← hub styles
│   ├── components/
│   │   ├── AuthModal.js      ← login/signup modal
│   │   └── AuthModal.module.css
│   └── lib/
│       ├── firebase.js       ← firebase setup + helpers
│       └── AuthContext.js    ← auth state across the app
├── .env.local.example        ← copy this to .env.local
├── .gitignore
├── next.config.js
├── package.json
└── vercel.json
```
