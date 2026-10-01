import { useCallback, useState } from "react";
import { getSession, setSession } from "./api";
import AuthPanel from "./components/AuthPanel";
import Nav from "./components/Nav";
import EventsPanel from "./components/EventsPanel";
import BookingsPanel from "./components/BookingsPanel";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [session, setSessionState] = useState(getSession());
  const [refreshToken, setRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState("events");

  const bump = useCallback(() => setRefreshToken((n) => n + 1), []);

  function handleLogout() {
    setSession(null);
    setSessionState(null);
  }

  if (!session) {
    return <AuthPanel onAuthenticated={setSessionState} />;
  }

  const isAdmin = session.role === "ADMIN";
  const initial = session.email.charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <TicketBadge />
          <span>EventVault</span>
        </div>
        <Nav active={activeTab} onChange={setActiveTab} isAdmin={isAdmin} />
        <div className="session-bar">
          <div className="avatar">{initial}</div>
          <div className="session-text">
            <span className="session-email">{session.email}</span>
            <span className={`role-pill role-${session.role.toLowerCase()}`}>{session.role}</span>
          </div>
          <button className="ghost icon-btn" onClick={handleLogout} title="Log out">
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main>
        {activeTab === "events" && <EventsPanel refreshToken={refreshToken} onChange={bump} />}
        {activeTab === "bookings" && <BookingsPanel refreshToken={refreshToken} onChange={bump} />}
        {activeTab === "admin" && isAdmin && <AdminPanel onEventCreated={bump} />}
      </main>
    </div>
  );
}

function TicketBadge() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a3 3 0 1 1 0-6c.35.71 1.06 1.2 1.85 1.2s1.5-.49 1.85-1.2H21a3 3 0 1 1 0 6v6a3 3 0 1 1 0 6H6.7c-.35-.71-1.06-1.2-1.85-1.2S3.35 20.29 3 21a3 3 0 1 1 0-6z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
