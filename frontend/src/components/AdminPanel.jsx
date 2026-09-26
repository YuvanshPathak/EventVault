import { useState } from "react";
import { api } from "../api";

export default function AdminPanel({ onEventCreated }) {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.target);
    try {
      await api("/admin/events", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          venue: form.get("venue"),
          description: form.get("description") || null,
          startTime: form.get("startTime"),
          totalSeats: Number(form.get("totalSeats")),
        }),
      });
      e.target.reset();
      onEventCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>Create event (admin)</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input type="text" name="name" required />
        </label>
        <label>
          Venue
          <input type="text" name="venue" required />
        </label>
        <label>
          Description
          <input type="text" name="description" />
        </label>
        <label>
          Start time
          <input type="datetime-local" name="startTime" required />
        </label>
        <label>
          Total seats
          <input type="number" name="totalSeats" min="1" defaultValue={10} required />
        </label>
        <button type="submit" disabled={submitting}>Create event</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
