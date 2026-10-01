import { useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "../ToastContext";

function SeatBar({ available, total }) {
  const ratio = total === 0 ? 0 : available / total;
  const level = ratio === 0 ? "none" : ratio < 0.25 ? "low" : ratio < 0.6 ? "mid" : "high";
  return (
    <div className="seat-bar">
      <div className="seat-bar-track">
        <div className={`seat-bar-fill seat-bar-${level}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className={`seat-count seat-count-${level}`}>
        {available === 0 ? "Sold out" : `${available} / ${total} seats left`}
      </span>
    </div>
  );
}

function EventCardSkeleton() {
  return (
    <div className="event-card skeleton-card">
      <div className="skeleton-line w-60" />
      <div className="skeleton-line w-40" />
      <div className="skeleton-line w-100" style={{ height: 8, marginTop: 12 }} />
      <div className="skeleton-line w-30" style={{ height: 32, marginTop: 14 }} />
    </div>
  );
}

export default function EventsPanel({ refreshToken, onChange }) {
  const [events, setEvents] = useState([]);
  const [strategy, setStrategy] = useState("pessimistic");
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState(null);
  const toast = useToast();

  async function loadEvents() {
    setLoading(true);
    try {
      const page = await api("/events?size=50&sort=startTime");
      setEvents(page.content);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  async function bookEvent(ev) {
    setBookingId(ev.id);
    try {
      await api(`/bookings/${strategy}`, {
        method: "POST",
        body: JSON.stringify({ eventId: ev.id, seats: 1 }),
      });
      toast.success(`Booked a seat for "${ev.name}"`);
      await loadEvents();
      onChange();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBookingId(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Events</h2>
          <p className="panel-subtitle">Browse what's on and grab a seat before it's gone.</p>
        </div>
        <div className="toolbar">
          <label className="strategy-picker">
            <span>Locking strategy</span>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              <option value="pessimistic">Pessimistic — SELECT ... FOR UPDATE</option>
              <option value="optimistic">Optimistic — @Version</option>
            </select>
          </label>
          <button className="ghost icon-btn" onClick={loadEvents} title="Refresh">
            <RefreshIcon />
          </button>
        </div>
      </div>

      {loading && (
        <div className="event-grid">
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="empty-state">
          <CalendarIcon />
          <p>No events yet — check back soon.</p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="event-grid">
          {events.map((ev) => {
            const soldOut = ev.availableSeats === 0;
            return (
              <div className="event-card" key={ev.id}>
                <div className="event-card-top">
                  <h3>{ev.name}</h3>
                  <div className="event-meta-line">
                    <PinIcon /> <span>{ev.venue}</span>
                  </div>
                  <div className="event-meta-line">
                    <ClockIcon /> <span>{new Date(ev.startTime).toLocaleString()}</span>
                  </div>
                  {ev.description && <p className="event-description">{ev.description}</p>}
                </div>
                <SeatBar available={ev.availableSeats} total={ev.totalSeats} />
                <button
                  className="book-btn"
                  disabled={soldOut || bookingId === ev.id}
                  onClick={() => bookEvent(ev)}
                >
                  {bookingId === ev.id ? "Booking…" : soldOut ? "Sold out" : "Book a seat"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
