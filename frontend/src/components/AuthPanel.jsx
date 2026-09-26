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
    <section className="card">
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
        <form className="tab-panel active" onSubmit={handleLogin}>
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <label>
            Password
            <input type="password" name="password" required />
          </label>
          <button type="submit" disabled={submitting}>Log in</button>
          <p className="hint">Seeded admin (dev profile): admin@eventvault.dev / admin1234</p>
        </form>
      ) : (
        <form className="tab-panel active" onSubmit={handleRegister}>
          <label>
            Name
            <input type="text" name="name" required />
          </label>
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <label>
            Password
            <input type="password" name="password" minLength={8} required />
          </label>
          <button type="submit" disabled={submitting}>Register</button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  );
}
