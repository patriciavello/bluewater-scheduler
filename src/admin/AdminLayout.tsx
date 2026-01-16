import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* Top Navigation Bar */}
      <header
        style={{
          background: "#0f172a",
          color: "white",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <div style={{ fontWeight: 900, fontSize: 18 }}>
          Bluewater Admin
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", gap: 12 }}>
          <NavLink
            to="/admin/reservations"
            style={({ isActive }) => ({
              ...navLinkBase,
              ...(isActive ? navLinkActive : {}),
            })}
          >
            Reservations
          </NavLink>

          <NavLink
            to="/admin/boats"
            style={({ isActive }) => ({
              ...navLinkBase,
              ...(isActive ? navLinkActive : {}),
            })}
          >
            Boats
          </NavLink>
        </nav>

        {/* Exit */}
        <NavLink to="/" style={navLinkBase}>
          Exit
        </NavLink>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: 20, background: "#f8fafc" }}>
        <Outlet />
      </main>
    </div>
  );
}

const navLinkBase: React.CSSProperties = {
  color: "white",
  textDecoration: "none",
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 8,
  transition: "background 0.2s",
};

const navLinkActive: React.CSSProperties = {
  background: "#2563eb", // nice blue highlight
};
