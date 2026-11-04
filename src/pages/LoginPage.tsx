import { FormEvent, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { ErrorBanner } from "../components/common";
import { BrandMark } from "../components/Layout";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await (mode === "login" ? login : register)(email, password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authwrap">
      <section className="brandpanel" aria-hidden="true">
        <span className="brand"><BrandMark size={28} />ceevee</span>
        <div>
          <h2>One link per role. Always the right resume.</h2>
          <p>Keep a resume for every kind of job, share a single link for each, and change what it shows whenever you like. Links you already sent never go stale.</p>
        </div>
        <div className="stackart"><i /><i /><i /></div>
      </section>
      <main className="authform">
        <form onSubmit={submit}>
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="muted" style={{ margin: "0 0 24px" }}>{mode === "login" ? "Log in to manage your resumes." : "It takes a minute. No card needed."}</p>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "register" && <span className="muted small-text">At least 8 characters.</span>}
          </div>
          <ErrorBanner error={error} />
          <div className="row" style={{ marginTop: 18 }}>
            <button className="primary" disabled={busy}>{mode === "login" ? "Log in" : "Sign up"}</button>
            <button type="button" className="ghost" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
              {mode === "login" ? "Need an account?" : "Have an account?"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
