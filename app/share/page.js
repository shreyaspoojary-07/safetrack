"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

const SEND_EVERY_MS = 30000; // one update every 30 seconds

export default function Share() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [consent, setConsent] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [lastSent, setLastSent] = useState(null);
  const [contact, setContact] = useState("");
  const watchId = useRef(null);
  const lastWrite = useRef(0);
  const lastPos = useRef(null);
  const wakeLock = useRef(null);

  useEffect(() => {
    setContact(localStorage.getItem("emergencyContact") || "");
    return onAuthStateChanged(auth, (u) => (u ? setUser(u) : router.push("/")));
  }, [router]);

  // Re-acquire wake lock if the tab becomes visible again.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && sharing) requestWake();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sharing]);

  async function requestWake() {
    try {
      if ("wakeLock" in navigator) wakeLock.current = await navigator.wakeLock.request("screen");
    } catch {}
  }

  async function pushLocation(pos, extra = {}) {
    const { latitude, longitude, accuracy } = pos.coords;
    await setDoc(
      doc(db, "live", user.uid),
      {
        name: user.displayName || user.email,
        lat: latitude,
        lng: longitude,
        accuracy,
        sharing: true,
        updatedAt: serverTimestamp(),
        clientTime: Date.now(),
        ...extra,
      },
      { merge: true }
    );
    setLastSent(new Date());
  }

  function start() {
    setError("");
    if (!navigator.geolocation) return setError("This device does not support location.");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPos.current = pos;
        const now = Date.now();
        if (now - lastWrite.current >= SEND_EVERY_MS) {
          lastWrite.current = now;
          pushLocation(pos).catch((e) => setError(e.message));
        }
      },
      (err) => {
        setError(err.code === 1 ? "Location permission was denied. Allow it in browser settings." : err.message);
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    requestWake();
    setSharing(true);
  }

  async function stop() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    try { wakeLock.current?.release(); } catch {}
    setSharing(false);
    setLastSent(null);
    lastWrite.current = 0;
    if (user) {
      try { await deleteDoc(doc(db, "live", user.uid)); } catch {}
    }
  }

  function toggle(e) {
    if (e.target.checked) start();
    else stop();
  }

  function saveContact(v) {
    setContact(v);
    localStorage.setItem("emergencyContact", v);
  }

  async function sos() {
    const pos = lastPos.current;
    const send = (p) => {
      const link = p ? `https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}` : "";
      if (p) pushLocation(p, { sos: true, sosAt: Date.now() }).catch(() => {});
      if (contact) {
        const body = encodeURIComponent(`SOS! I need help. My location: ${link}`);
        window.location.href = `sms:${contact}?body=${body}`; // works with no mobile data
      }
    };
    if (pos) return send(pos);
    navigator.geolocation.getCurrentPosition(send, () => send(null), { enableHighAccuracy: true, timeout: 10000 });
  }

  if (!user) return <main><p className="muted">Loading…</p></main>;

  return (
    <main>
      <h1>Hi, {user.displayName || "there"}</h1>
      <p className="muted">You decide when your location is shared.</p>

      <div className="panel">
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input type="checkbox" checked={consent} disabled={sharing}
            onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 4 }} />
          <span className="muted">
            I agree to share my live location with the safety team while the switch below is on.
            Turning it off stops sharing and deletes my live location.
          </span>
        </label>

        <div className="switch" style={{ marginTop: 14 }}>
          <div className="status">
            <span className={`dot ${sharing ? "on" : ""}`} />
            {sharing ? "Sharing location" : "Not sharing"}
          </div>
          <input type="checkbox" role="switch" aria-label="Share my location"
            checked={sharing} disabled={!consent} onChange={toggle} />
        </div>

        {sharing && (
          <p className="muted">
            {lastSent ? `Last sent ${lastSent.toLocaleTimeString()}` : "Waiting for GPS…"}
            <br />Keep this page open and the screen on for continuous updates.
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Emergency</h2>
        <input type="tel" placeholder="Emergency contact number (for SMS)"
          value={contact} onChange={(e) => saveContact(e.target.value)} />
        <button className="sos" onClick={sos}>Send SOS</button>
        <p className="muted">
          SOS alerts the safety team and opens a text to your emergency contact
          with a map link. The text works without mobile data.
        </p>
      </div>

      <button className="secondary" onClick={async () => { await stop(); await signOut(auth); router.push("/"); }}>
        Sign out
      </button>
    </main>
  );
}
