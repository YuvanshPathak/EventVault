import { useState } from "react";
import { api } from "../api";
import { useToast } from "../ToastContext";

export default function AdminPanel({ onEventCreated }) {
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.target);
    try {
      const event = await api("/admin/events", {
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
      toast.success(`Created "${event.name}"`);
      onEventCreated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Create event</h2>
          <p className="panel-subtitle">Admin only — publish a new event for people to book.</p>
        </div>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Name
            <input type="text" name="name" placeholder="Spring Boot Conf 2027" required />
          </label>
          <label>
            Venue
            <input type="text" name="venue" placeholder="Main Auditorium" required />
          </label>
          <label className="span-2">
            Description
            <input type="text" name="description" placeholder="Optional" />
          </label>
          <label>
            Start time
            <input type="datetime-local" name="startTime" required />
          </label>
          <label>
            Total seats
            <input type="number" name="totalSeats" min="1" defaultValue={10} required />
          </label>
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create event"}
        </button>
      </form>
    </section>
  );
}
