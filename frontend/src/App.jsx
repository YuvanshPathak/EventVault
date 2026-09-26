import { useCallback, useState } from "react";
import { getSession, setSession } from "./api";
import AuthPanel from "./components/AuthPanel";
import EventsPanel from "./components/EventsPanel";
import BookingsPanel from "./components/BookingsPanel";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [session, setSessionState] = useState(getSession());
  const [refreshToken, setRefreshToken] = useState(0);

  const bump = useCallback(() => setRefreshToken((n) => n + 1), []);

  function handleLogout() {
    setSession(null);
    setSessionState(null);
  }

  return (
    <>
      <header>
        <h1>EventVault</h1>
        {session && (
          <div id="session-bar">
            <span id="who">{session.email} ({session.role})</span>
            <button className="ghost" onClick={handleLogout}>Log out</button>
          </div>
        )}
      </header>

      <main>
        {!session ? (
          <AuthPanel onAuthenticated={setSessionState} />
        ) : (
          <>
            {session.role === "ADMIN" && <AdminPanel onEventCreated={bump} />}
            <EventsPanel refreshToken={refreshToken} onChange={bump} />
            <BookingsPanel refreshToken={refreshToken} onChange={bump} />
          </>
        )}
      </main>
    </>
  );
}
