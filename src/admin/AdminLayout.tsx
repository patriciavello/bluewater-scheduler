import { Link, Outlet, useLocation } from "react-router-dom";

export default function AdminLayout() {
  const { pathname } = useLocation();

  const linkStyle = (active: boolean) => ({
    display: "block",
    padding: "10px 12px",
    borderRadius: 10,
    textDecoration: "none",
    border: "1px solid #ddd",
    background: active ? "#f3f3f3" : "white",
    color: "black",
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{ padding: 16, borderRight: "1px solid #ddd" }}>
        <h2 style={{ marginTop: 0 }}>Admin</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <Link to="/admin/boats" style={linkStyle(pathname.startsWith("/admin/boats"))}>Boats</Link>
          <Link to="/admin/reservations" style={linkStyle(pathname.startsWith("/admin/reservations"))}>Reservations</Link>
          <Link to="/" style={linkStyle(false)}>← Back to Scheduler</Link>
        </div>
      </aside>

      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}
