"use client";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import "leaflet/dist/leaflet.css";

function ago(ms) {
  if (!ms) return "unknown";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [people, setPeople] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, tick] = useState(0);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markers = useRef({});
  const fitted = useRef(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      if (u) {
        const snap = await getDoc(doc(db, "admins", u.uid));
        setIsAdmin(snap.exists());
      }
    });
  }, []);

  // Live list of people who are sharing
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "live"), where("sharing", "==", true));
    return onSnapshot(q, (snap) => {
      setPeople(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (e) => setError(e.message));
  }, [isAdmin]);

  // Refresh "x seconds ago" labels
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  // Create the map once
  useEffect(() => {
    if (!isAdmin || leafletRef.current) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !document.getElementById("map")) return;
      const map = L.map("map").setView([12.9716, 77.5946], 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      leafletRef.current = { L, map };
      mapRef.current = map;
      tick((n) => n + 1);
    });
    return () => { cancelled = true; };
  }, [isAdmin]);

  // Sync markers with data
  useEffect(() => {
    const ctx = leafletRef.current;
    if (!ctx) return;
    const { L, map } = ctx;
    const seen = new Set();
    people.forEach((p) => {
      if (typeof p.lat !== "number") return;
      seen.add(p.id);
      const color = p.sos ? "#b3261e" : "#14532d";
      const label = `${p.name}${p.sos ? " (SOS)" : ""}`;
      if (markers.current[p.id]) {
        markers.current[p.id].setLatLng([p.lat, p.lng]).setStyle({ color, fillColor: color });
      } else {
        markers.current[p.id] = L.circleMarker([p.lat, p.lng], {
          radius: 10, color, fillColor: color, fillOpacity: 0.7,
        }).addTo(map).bindTooltip(label, { permanent: true, direction: "top" });
      }
      markers.current[p.id].setTooltipContent(label);
    });
    Object.keys(markers.current).forEach((id) => {
      if (!seen.has(id)) { markers.current[id].remove(); delete markers.current[id]; }
    });
    if (!fitted.current && people.length) {
      const pts = people.filter((p) => typeof p.lat === "number").map((p) => [p.lat, p.lng]);
      if (pts.length) { map.fitBounds(pts, { padding: [50, 50], maxZoom: 16 }); fitted.current = true; }
    }
  }, [people, leafletRef.current]);

  async function login(e) {
    e.preventDefault();
    setError("");
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (err) { setError(err.message.replace("Firebase: ", "")); }
  }

  if (user === undefined) return <main><p className="muted">Loading…</p></main>;

  if (!user)
    return (
      <main>
        <h1>Safety team sign in</h1>
        <form className="panel" onSubmit={login}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="error">{error}</p>}
          <button>Sign in</button>
        </form>
      </main>
    );

  if (!isAdmin)
    return (
      <main>
        <h1>No access</h1>
        <p className="muted">This account is not on the safety team. Ask the owner to add you.</p>
        <button className="secondary" onClick={() => signOut(auth)}>Sign out</button>
      </main>
    );

  const sorted = [...people].sort((a, b) => (b.sos ? 1 : 0) - (a.sos ? 1 : 0));

  return (
    <main className="wide">
      <h1>Live locations</h1>
      <p className="muted">{people.length} sharing now. People who switch sharing off disappear from this view.</p>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        <div id="map" />
        <div className="panel" style={{ margin: 0, maxHeight: 540, overflow: "auto" }}>
          {sorted.length === 0 && <p className="muted">Nobody is sharing right now.</p>}
          {sorted.map((p) => (
            <div key={p.id} className={`row ${p.sos ? "sos" : ""}`}
              onClick={() => leafletRef.current?.map.setView([p.lat, p.lng], 17)}>
              <b>{p.name}{p.sos ? " — SOS" : ""}</b>
              <span className="muted">
                Updated {ago(p.clientTime)} · accuracy {Math.round(p.accuracy || 0)} m
              </span>
            </div>
          ))}
        </div>
      </div>
      <button className="secondary" style={{ maxWidth: 200, marginTop: 16 }} onClick={() => signOut(auth)}>Sign out</button>
    </main>
  );
}
