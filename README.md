# SafeTrack

Opt-in location sharing: users flip a switch, the safety team sees them on a live map.
Built with Next.js + Firebase (Auth + Firestore). Deploys on Vercel.

## 1. Set up Firebase (free Spark plan)
1. Go to https://console.firebase.google.com and click **Add project**.
2. **Build > Authentication > Get started > Email/Password > Enable**.
3. **Build > Firestore Database > Create database** (production mode, pick a nearby region such as asia-south1).
4. Open the **Rules** tab, paste the contents of `firestore.rules`, click **Publish**.
5. **Project settings (gear icon) > General > Your apps > Web (</>)**, register an app and copy the config values.

## 2. Run locally
```bash
npm install
cp .env.example .env.local   # fill in the six Firebase values
npm run dev                  # http://localhost:3000
```

## 3. Make yourself an admin
1. Open the app, create an account at `/` (or at /admin sign in with an existing one).
2. In Firebase console: **Authentication > Users**, copy your **User UID**.
3. **Firestore > Start collection** named `admins`, set **Document ID** = your UID, add any field (e.g. `role` = `admin`), Save.
4. Visit `/admin` and sign in.

## 4. Push to GitHub
```bash
git init
git add .
git commit -m "SafeTrack"
git branch -M main
git remote add origin https://github.com/YOUR_USER/safetrack.git
git push -u origin main
```

## 5. Deploy on Vercel
1. Go to https://vercel.com, sign in with GitHub, click **Add New > Project**.
2. Import the `safetrack` repository. Framework is auto-detected as Next.js.
3. Open **Environment Variables** and add all six `NEXT_PUBLIC_FIREBASE_*` values from `.env.example`.
4. Click **Deploy**. You get a URL like `https://safetrack.vercel.app`.
5. In Firebase: **Authentication > Settings > Authorized domains > Add domain** and add your Vercel domain. Without this, sign-in fails.

## 6. Install on phones
Open the Vercel URL on the phone, then Chrome menu > **Add to Home screen** (iOS Safari: Share > **Add to Home Screen**). Location needs HTTPS, which Vercel provides.

## Limits you should know
- A web app can only track while the page is open and the screen is on (the app requests a screen wake lock). When the browser is closed or the phone locks, updates pause.
- Without internet, updates are queued and sent when the connection returns. Only the latest position is kept, not a full trail.
- The SOS button opens an SMS with a map link, which works with no mobile data.
- For true background tracking, you need a native app (Flutter) published on the Play Store / App Store. Firebase and the rules here can be reused.
