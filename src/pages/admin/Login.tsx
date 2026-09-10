import { useState, type FormEvent } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import { loginAdmin } from "../../utils/adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await loginAdmin(email, password);
      const destination = typeof location.state?.from === "string" ? location.state.from : "/admin";
      navigate(destination, { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel">
        <div className="admin-brand">
          <div className="admin-brand-mark">A</div>
          <div>
            <p>Averon Technologies</p>
            <strong>Admin V1</strong>
          </div>
        </div>

        <form className="admin-login-card" onSubmit={handleSubmit}>
          <p className="admin-eyebrow">Secure administrator access</p>
          <h1>Control the Averon operating system.</h1>
          <p>Sign in with a Firebase account that has an owner or admin custom claim.</p>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          {error && <p className="admin-form-error">{error}</p>}
          <button className="admin-primary-button" type="submit" disabled={submitting}>
            <LogIn size={18} />
            {submitting ? "Signing in..." : "Sign in to admin"}
          </button>
        </form>
      </section>

      <aside className="admin-login-aside">
        <ShieldCheck size={28} />
        <h2>Launch-ready access boundary</h2>
        <p>Admin pages use Firebase Authentication, Firestore rules, and explicit empty states for data that does not exist yet.</p>
      </aside>
    </main>
  );
}
