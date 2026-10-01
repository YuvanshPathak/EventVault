import { useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "../ToastContext";

export default function BookingsPanel({ refreshToken, onChange }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const toast = useToast();

  async function loadBookings() {
    setLoading(true);
    try {
      const page = await api("/bookings/history?size=50&sort=bookedAt,desc");
      setBookings(page.content);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  async function cancelBooking(b) {
    setCancellingId(b.id);
    try {
      await api(`/bookings/${b.id}`, { method: "DELETE" });
      toast.success(`Cancelled your booking for "${b.eventName}"`);
      await loadBookings();
      onChange();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>My bookings</h2>
          <p className="panel-subtitle">Everything you've booked, confirmed or cancelled.</p>
        </div>
      </div>

      {loading && (
        <div className="booking-list">
          <div className="booking-card skeleton-card">
            <div className="skeleton-line w-50" />
            <div className="skeleton-line w-30" />
          </div>
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <div className="empty-state">
          <TicketIcon />
          <p>No bookings yet — go grab a seat.</p>
        </div>
      )}

      {!loading && bookings.length > 0 && (
        <div className="booking-list">
          {bookings.map((b) => {
            const isConfirmed = b.status === "CONFIRMED";
            return (
              <div className={`booking-card status-${isConfirmed ? "confirmed" : "cancelled"}`} key={b.id}>
                <div className="booking-stripe" />
                <div className="booking-body">
                  <div className="booking-main">
                    <strong>{b.eventName}</strong>
                    <span className="booking-sub">
                      {b.seatsBooked} seat{b.seatsBooked > 1 ? "s" : ""} · booked {new Date(b.bookedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="booking-actions">
                    <span className={`status-pill status-pill-${isConfirmed ? "confirmed" : "cancelled"}`}>
                      {b.status}
                    </span>
                    {isConfirmed && (
                      <button
                        className="danger small"
                        disabled={cancellingId === b.id}
                        onClick={() => cancelBooking(b)}
                      >
                        {cancellingId === b.id ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TicketIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a3 3 0 1 1 0-6c.35.71 1.06 1.2 1.85 1.2s1.5-.49 1.85-1.2H21a3 3 0 1 1 0 6v6a3 3 0 1 1 0 6H6.7c-.35-.71-1.06-1.2-1.85-1.2S3.35 20.29 3 21a3 3 0 1 1 0-6z" />
    </svg>
  );
}
