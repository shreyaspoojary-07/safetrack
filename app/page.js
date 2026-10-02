"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/share");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>SafeTrack</h1>
      <p className="muted">
        Share your live location with the safety team only when you choose to.
        You can stop at any time.
      </p>

      <form className="panel" onSubmit={submit}>
        <h2>{mode === "signup" ? "Create account" : "Sign in"}</h2>
        {mode === "signup" && (
          <input type="text" placeholder="Full name" value={name}
            onChange={(e) => setName(e.target.value)} required />
        )}
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (6+ characters)" value={password}
          onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{mode === "signup" ? "Create account" : "Sign in"}</button>
        <button type="button" className="secondary"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
          {mode === "signup" ? "I already have an account" : "Create a new account"}
        </button>
      </form>

      <p className="muted"><a href="/admin">Safety team dashboard</a></p>
    </main>
  );
}
