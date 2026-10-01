const TABS = [
  { id: "events", label: "Events" },
  { id: "bookings", label: "My Bookings" },
];

export default function Nav({ active, onChange, isAdmin }) {
  const tabs = isAdmin ? [...TABS, { id: "admin", label: "Admin" }] : TABS;

  return (
    <nav className="app-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${active === tab.id ? "active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
