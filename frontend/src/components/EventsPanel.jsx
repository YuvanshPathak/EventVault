import { useEffect, useState } from "react";
import { api } from "../api";

export default function EventsPanel({ refreshToken, onChange }) {
  const [events, setEvents] = useState([]);
  const [strategy, setStrategy] = useState("pessimistic");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState(null);

  async function loadEvents() {
    setError(null);
    setLoading(true);
    try {
      const page = await api("/events?size=50&sort=startTime");
      setEvents(page.content);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [refreshToken]);

  async function bookEvent(eventId) {
    setError(null);
    setBookingId(eventId);
    try {
      await api(`/bookings/${strategy}`, {
        method: "POST",
        body: JSON.stringify({ eventId, seats: 1 }),
      });
      await loadEvents();
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingId(null);
    }
  }

  return (
    <section className="card">
      <h2>Events</h2>
      <div className="toolbar">
        <label className="inline">
          Booking strategy
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="pessimistic">Pessimistic (SELECT ... FOR UPDATE)</option>
            <option value="optimistic">Optimistic (@Version)</option>
          </select>
        </label>
        <button className="ghost" onClick={loadEvents}>Refresh</button>
      </div>

      {loading && <p className="empty">Loading…</p>}
      {!loading && events.length === 0 && <p className="empty">No events yet.</p>}

      {events.map((ev) => {
        const soldOut = ev.availableSeats === 0;
        return (
          <div className="event-row" key={ev.id}>
            <div className="event-meta">
              <strong>{ev.name}</strong>
              <span>{ev.venue} · {new Date(ev.startTime).toLocaleString()}</span>
            </div>
            <div className="row-actions">
              <span className={`seats-badge ${soldOut ? "sold-out" : ""}`}>
                {ev.availableSeats}/{ev.totalSeats} seats
              </span>
              <button
                disabled={soldOut || bookingId === ev.id}
                onClick={() => bookEvent(ev.id)}
              >
                Book
              </button>
            </div>
          </div>
        );
      })}

      {error && <p className="error">{error}</p>}
    </section>
  );
}
