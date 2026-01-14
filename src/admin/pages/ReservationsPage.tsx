import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../api";
import type { Reservation } from "../api";
import ReservationForm from "../components/ReservationForm";

function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmt(dtIso: string) {
  // Simple local display
  const d = new Date(dtIso);
  if (Number.isNaN(d.getTime())) return dtIso;
  return d.toLocaleString();
}

export default function ReservationsPage() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toYmd(new Date(today.getFullYear(), today.getMonth(), today.getDate())));
  const [to, setTo] = useState(toYmd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14)));
  const [status, setStatus] = useState<"all" | "active" | "cancelled">("all");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Reservation[]>([]);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (status !== "all") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());

      const data = await adminApi.listReservations(params.toString());
      setItems(data.reservations || []);
    } catch (e: any) {
      setError(e.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // initial
  // (Optional) auto reload on filter changes:
  useEffect(() => { load(); }, [from, to, status]); // keep q manual via button

  async function onCancel(r: Reservation) {
    if (!confirm(`Cancel reservation #${r.id}?`)) return;
    try {
      await adminApi.cancelReservation(r.id);
      await load();
    } catch (e: any) {
      alert(e.message || "Failed to cancel");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Reservations</h1>
        <button onClick={() => setCreating(true)}>+ New Reservation</button>
      </div>

      {/* Filters */}
      <div style={{
        marginTop: 12,
        display: "grid",
        gridTemplateColumns: "180px 180px 180px 1fr 120px",
        gap: 10,
        alignItems: "end"
      }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Search (name/email/notes/boat)</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. John, @gmail, Sea Ray..." />
        </label>

        <button onClick={load} style={{ height: 38 }}>Search</button>
      </div>

      {loading && <p style={{ marginTop: 12 }}>Loading…</p>}
      {error && <p style={{ marginTop: 12, color: "crimson" }}>{error}</p>}

      {/* Table */}
      {!loading && !error && (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Boat</th>
                <th style={th}>Start</th>
                <th style={th}>End</th>
                <th style={th}>Customer</th>
                <th style={th}>Status</th>
                <th style={thRight}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={String(r.id)}>
                  <td style={tdMono}>{r.id}</td>
                  <td style={td}>{r.boatName ?? r.boatId}</td>
                  <td style={td}>{fmt(r.startDate)}</td>
                  <td style={td}>{fmt(r.endExclusive)}</td>
                  <td style={td}>
                    <div style={{ display: "grid" }}>
                      <span>{r.requesterName || "-"}</span>
                      <span style={{ opacity: 0.7, fontSize: 12 }}>{r.requesterEmail || ""}</span>
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      fontSize: 12
                    }}>
                      {r.status || "active"}
                    </span>
                  </td>
                  <td style={tdRight}>
                    <button onClick={() => setEditing(r)}>Edit</button>{" "}
                    <button onClick={() => onCancel(r)} disabled={(r.status === "cancelled")}>
                      Cancel
                    </button>
                    <button onClick={() => approve(r.id)}>Approve</button>
                    <button onClick={() => deny(r.id)}>Deny</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 12, opacity: 0.7 }}>No reservations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <ReservationForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => {
            setCreating(false); setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 };
const thRight: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: 8, borderBottom: "1px solid #eee" };
const tdRight: React.CSSProperties = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const tdMono: React.CSSProperties = { ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" };


