import { useState } from "react";
import { api, setSession } from "../api";

export default function AuthPanel({ onAuthenticated }) {
  const [tab, setTab] = useState("login");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.target);
    try {
      const session = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setSession(session);
      onAuthenticated(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.target);
    try {
      const session = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setSession(session);
      onAuthenticated(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-logo">
            <TicketBadge />
            <span>EventVault</span>
          </div>
          <h2>Book seats without the race condition.</h2>
          <p>
            A demo booking platform built to show pessimistic vs. optimistic
            locking, JWT auth, and role-based access — end to end.
          </p>
          <ul className="auth-feature-list">
            <li><CheckIcon /> Two locking strategies, side by side</li>
            <li><CheckIcon /> JWT-based stateless authentication</li>
            <li><CheckIcon /> Admin and user roles</li>
          </ul>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="tabs">
            <button
              type="button"
              className={`tab-btn ${tab === "login" ? "active" : ""}`}
              onClick={() => { setTab("login"); setError(null); }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`tab-btn ${tab === "register" ? "active" : ""}`}
              onClick={() => { setTab("register"); setError(null); }}
            >
              Register
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin}>
              <label>
                Email
                <input type="email" name="email" placeholder="you@example.com" required />
              </label>
              <label>
                Password
                <input type="password" name="password" placeholder="••••••••" required />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? "Logging in…" : "Log in"}
              </button>
              <p className="hint">Seeded admin (dev profile): admin@eventvault.dev / admin1234</p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <label>
                Name
                <input type="text" name="name" placeholder="Jane Doe" required />
              </label>
              <label>
                Email
                <input type="email" name="email" placeholder="you@example.com" required />
              </label>
              <label>
                Password
                <input type="password" name="password" placeholder="At least 8 characters" minLength={8} required />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? "Creating account…" : "Register"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketBadge() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a3 3 0 1 1 0-6c.35.71 1.06 1.2 1.85 1.2s1.5-.49 1.85-1.2H21a3 3 0 1 1 0 6v6a3 3 0 1 1 0 6H6.7c-.35-.71-1.06-1.2-1.85-1.2S3.35 20.29 3 21a3 3 0 1 1 0-6z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
