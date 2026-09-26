import { useEffect, useState } from "react";
import { api } from "../api";

export default function BookingsPanel({ refreshToken, onChange }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  async function loadBookings() {
    setError(null);
    setLoading(true);
    try {
      const page = await api("/bookings/history?size=50&sort=bookedAt,desc");
      setBookings(page.content);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, [refreshToken]);

  async function cancelBooking(id) {
    setError(null);
    setCancellingId(id);
    try {
      await api(`/bookings/${id}`, { method: "DELETE" });
      await loadBookings();
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="card">
      <h2>My bookings</h2>

      {loading && <p className="empty">Loading…</p>}
      {!loading && bookings.length === 0 && <p className="empty">No bookings yet.</p>}

      {bookings.map((b) => {
        const isConfirmed = b.status === "CONFIRMED";
        return (
          <div className="booking-row" key={b.id}>
            <div className="booking-meta">
              <strong>{b.eventName}</strong>
              <span>{b.seatsBooked} seat(s) · booked {new Date(b.bookedAt).toLocaleString()}</span>
            </div>
            <div className="row-actions">
              <span className={`status-badge ${isConfirmed ? "confirmed" : "cancelled"}`}>{b.status}</span>
              {isConfirmed && (
                <button
                  className="danger"
                  disabled={cancellingId === b.id}
                  onClick={() => cancelBooking(b.id)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      })}

      {error && <p className="error">{error}</p>}
    </section>
  );
}
