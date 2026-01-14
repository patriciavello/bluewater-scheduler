import React, { useEffect, useMemo, useState } from "react";
import AdminUsers from "./admin/AdminUsers";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

const TOKEN_KEY = "ADMIN_JWT";

type ReservationStatus =
  | "PENDING"
  | "APPROVED"
  | "DENIED"
  | "CANCELLED"
  | "BLOCKED"
  | string;

type AdminReservation = {
  id: string;
  boatId: string;
  boatName: string;
  startDate: string; // ISO
  endExclusive: string; // ISO
  status: ReservationStatus;
  requesterName: string | null;
  requesterEmail: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

type Boat = { id: string; name: string };

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmt(dtIso: string) {
  const d = new Date(dtIso);
  if (Number.isNaN(d.getTime())) return dtIso;
  return d.toLocaleString();
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await safeJson(res);
  if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
  return data as any;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function overlapsDay(startIso: string, endIso: string, day: Date) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);
  const s = new Date(startIso);
  const e = new Date(endIso);
  return s < dayEnd && e > dayStart;
}

function statusPriority(s: string) {
  const u = String(s).toUpperCase();
  if (u === "BLOCKED") return 50;
  if (u === "APPROVED") return 40;
  if (u === "PENDING") return 30;
  if (u === "DENIED") return 20;
  if (u === "CANCELLED") return 10;
  return 0;
}

function statusCellStyle(status: string): React.CSSProperties {
  const u = String(status).toUpperCase();
  if (!u) return { background: "white" };
  if (u === "BLOCKED") return { background: "#111827", color: "white" };
  if (u === "APPROVED") return { background: "#dbeafe" };
  if (u === "PENDING") return { background: "#fef3c7" };
  if (u === "DENIED") return { background: "#f3f4f6" };
  if (u === "CANCELLED") return { background: "#f3f4f6" };
  return { background: "#f3f4f6" };
}

function AdminCalendarView({
  token,
  start,
  days,
  apiBase,
}: {
  token: string;
  start: string; // yyyy-mm-dd
  days: number;
  apiBase: string;
}) {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const startDateObj = useMemo(() => new Date(`${start}T00:00:00`), [start]);
  const dayList = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(startDateObj, i)),
    [startDateObj, days]
  );

  async function block(boatId: string, day: Date) {
    const note = prompt("Block note (optional):") || "";
    const daysStr = prompt("How many days to block?", "1") || "1";
    const nDays = Math.max(1, Math.min(parseInt(daysStr, 10) || 1, 60));

    try {
      await fetchJson(`${apiBase}/api/admin/blocks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ boatId, startDate: dateKey(day), days: nDays, note }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to block");
    }
  }

  async function unblock(blockId: string) {
    if (!confirm("Remove this block?")) return;
    try {
      await fetchJson(`${apiBase}/api/admin/blocks/${blockId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to unblock");
    }
  }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const boatsData = await fetchJson(`${apiBase}/api/boats`);
      const resData = await fetchJson(
        `${apiBase}/api/admin/reservations?start=${encodeURIComponent(start)}&days=${encodeURIComponent(
          String(days)
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const b: Boat[] = (boatsData.boats || []).map((x: any) => ({
        id: x.id,
        name: x.name,
      }));

      setBoats(b);
      setReservations(resData.reservations || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, days]);

  const cellMap = useMemo(() => {
    const map = new Map<string, AdminReservation>();
    for (const r of reservations) {
      for (const day of dayList) {
        if (!overlapsDay(r.startDate, r.endExclusive, day)) continue;
        const key = `${r.boatId}|${dateKey(day)}`;
        const ex = map.get(key);
        if (!ex || statusPriority(r.status) > statusPriority(ex.status)) {
          map.set(key, r);
        }
      }
    }
    return map;
  }, [reservations, dayList]);

  return (
    <div style={{ marginTop: 14 }}>
      {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}
      {err && <div style={styles.error}>{err}</div>}

      <div style={styles.calendarWrap}>
        <div style={{ minWidth: Math.max(900, 220 + days * 70) }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `220px repeat(${days}, 70px)`,
              borderBottom: "1px solid #e5e7eb",
              background: "white",
            }}
          >
            <div style={{ padding: 10, fontWeight: 900 }}>Boats</div>
            {dayList.map((d) => (
              <div
                key={dateKey(d)}
                style={{
                  padding: 10,
                  fontSize: 12,
                  opacity: 0.85,
                  borderLeft: "1px solid #f1f5f9",
                }}
              >
                {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
            ))}
          </div>

          {boats.map((boat) => (
            <div
              key={boat.id}
              style={{
                display: "grid",
                gridTemplateColumns: `220px repeat(${days}, 70px)`,
                borderBottom: "1px solid #f1f5f9",
                background: "white",
              }}
            >
              <div style={{ padding: 10, fontWeight: 800 }}>{boat.name}</div>

              {dayList.map((d) => {
                const key = `${boat.id}|${dateKey(d)}`;
                const r = cellMap.get(key);
                const status = r ? String(r.status).toUpperCase() : "";
                const cellStyle = statusCellStyle(status);

                return (
                  <button
                    key={key}
                    style={{
                      border: "none",
                      borderLeft: "1px solid #f1f5f9",
                      padding: 8,
                      minHeight: 46,
                      textAlign: "left",
                      cursor: "pointer",
                      ...cellStyle,
                    }}
                    title={
                      r
                        ? `${boat.name}\n${fmt(r.startDate)} → ${fmt(r.endExclusive)}\n${status}\n${r.requesterName || ""} ${
                            r.requesterEmail || ""
                          }`
                        : "Click to block"
                    }
                    onClick={() => {
                      if (!r) return block(boat.id, d);

                      const st = String(r.status).toUpperCase();
                      if (st === "BLOCKED") return unblock(r.id);

                      alert(
                        `${boat.name}\n\n${fmt(r.startDate)} → ${fmt(r.endExclusive)}\nStatus: ${st}\n\nRequester: ${
                          r.requesterName || "—"
                        }\nEmail: ${r.requesterEmail || "—"}\n\nNotes: ${r.notes || "—"}\n\nID: ${r.id}`
                      );
                    }}
                  >
                    {status ? (
                      <div style={{ fontSize: 11, fontWeight: 900, lineHeight: 1.1 }}>{status}</div>
                    ) : (
                      <div style={{ opacity: 0.25 }}> </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        Click an empty cell to block dates. Click a BLOCKED cell to unblock.
      </div>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [view, setView] = useState<"calendar" | "list" | "users">("calendar");

  const [start, setStart] = useState(() => ymd(new Date()));
  const [days, setDays] = useState(14);
  const [showPendingOnly, setShowPendingOnly] = useState(true);
  const [search, setSearch] = useState("");

  const [items, setItems] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string>("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (items || [])
      .filter((r) => (!showPendingOnly ? true : String(r.status).toUpperCase() === "PENDING"))
      .filter((r) => {
        if (!s) return true;
        const hay = [r.boatName, r.requesterName || "", r.requesterEmail || "", r.status, r.id]
          .join(" ")
          .toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [items, showPendingOnly, search]);

  const pendingCount = useMemo(
    () => items.filter((r) => String(r.status).toUpperCase() === "PENDING").length,
    [items]
  );

  function setAndStoreToken(t: string) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    setToken(t);
  }

  async function login(e?: React.FormEvent) {
    e?.preventDefault?.();
    setError("");
    setLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await safeJson(res);
      if (!res.ok || !(data as any)?.ok || !(data as any)?.token) {
        throw new Error((data as any)?.error || "Login failed");
      }
      setAndStoreToken((data as any).token);
      setPassword("");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoggingIn(false);
    }
  }

  async function loadReservations() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const url = `${API_BASE}/api/admin/reservations?start=${encodeURIComponent(start)}&days=${encodeURIComponent(
        String(days)
      )}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeJson(res);

      if (!res.ok || !(data as any)?.ok) {
        throw new Error((data as any)?.error || `Failed to load (${res.status})`);
      }

      setItems(Array.isArray((data as any).reservations) ? (data as any).reservations : []);
    } catch (e: any) {
      const msg = e?.message || "Failed to load reservations";
      setError(msg);
      if (String(msg).toLowerCase().includes("unauthorized")) {
        setAndStoreToken("");
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: "approve" | "deny") {
    if (!token) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/reservations/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok || !(data as any)?.ok) {
        throw new Error((data as any)?.error || `Action failed (${res.status})`);
      }

      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: action === "approve" ? "APPROVED" : "DENIED" } : r))
      );
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setBusyId("");
    }
  }

  function logout() {
    setAndStoreToken("");
    setItems([]);
    setError("");
  }

  useEffect(() => {
    // Load reservations after login so Reservations tab has data
    if (token) loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const showFilters = token && view !== "users"; // users page has its own filters UI

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.h1}>Admin — Bluewater Scheduler</div>
          <div style={styles.sub}>
            API: <code style={styles.code}>{API_BASE}</code>
          </div>
        </div>

        {token ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button style={styles.btn} onClick={() => setView("calendar")} disabled={view === "calendar"}>
              Calendar
            </button>
            <button style={styles.btn} onClick={() => setView("list")} disabled={view === "list"}>
              Reservations
            </button>
            <button style={styles.btn} onClick={() => setView("users")} disabled={view === "users"}>
              Users
            </button>

            <button
              style={styles.btn}
              onClick={() => {
                // Refresh should only hit reservations endpoints when relevant
                if (view === "list") loadReservations();
              }}
              disabled={loading || view !== "list"}
              title={view !== "list" ? "Refresh is for Reservations list" : "Reload reservations"}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>

            <button style={styles.btn} onClick={logout}>
              Log out
            </button>
          </div>
        ) : null}
      </header>

      {!token ? (
        <section style={styles.card}>
          <form onSubmit={login} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Sign in</div>

            <label style={styles.label}>
              <span>Username</span>
              <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>

            <label style={styles.label}>
              <span>Password</span>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="change-me-now"
              />
            </label>

            {error ? <div style={styles.error}>{error}</div> : null}

            <button style={styles.primary} type="submit" disabled={loggingIn}>
              {loggingIn ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
      ) : (
        <>
          {showFilters ? (
            <section style={styles.card}>
              <div style={styles.filters}>
                <label style={styles.label}>
                  <span>Start</span>
                  <input
                    style={styles.input}
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>

                <label style={styles.label}>
                  <span>Days</span>
                  <input
                    style={styles.input}
                    type="number"
                    min={1}
                    max={60}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  />
                </label>

                {view === "list" ? (
                  <>
                    <label style={{ ...styles.label, minWidth: 220 }}>
                      <span>Search</span>
                      <input
                        style={styles.input}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="boat, name, email, id…"
                      />
                    </label>

                    <label style={{ ...styles.checkboxRow, marginTop: 22 }}>
                      <input
                        type="checkbox"
                        checked={showPendingOnly}
                        onChange={(e) => setShowPendingOnly(e.target.checked)}
                      />
                      <span>Pending only</span>
                    </label>

                    <div style={{ marginLeft: "auto", textAlign: "right", opacity: 0.8 }}>
                      Pending: <b>{pendingCount}</b> / Total: <b>{items.length}</b>
                    </div>
                  </>
                ) : (
                  <div style={{ marginLeft: "auto", textAlign: "right", opacity: 0.8 }}>
                    Calendar view (all boats × days)
                  </div>
                )}
              </div>

              {error ? <div style={{ ...styles.error, marginTop: 12 }}>{error}</div> : null}
            </section>
          ) : null}

          {/* ✅ ONLY ONE render path (no duplicates) */}
          {view === "calendar" ? (
            <AdminCalendarView token={token} start={start} days={days} apiBase={API_BASE} />
          ) : view === "users" ? (
            <AdminUsers />
          ) : (
            <section style={{ marginTop: 14 }}>
              {loading ? (
                <div style={{ opacity: 0.8 }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No reservations found.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {filtered.map((r) => {
                    const isPending = String(r.status).toUpperCase() === "PENDING";
                    return (
                      <div key={r.id} style={styles.row}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                            <div style={{ fontWeight: 900 }}>{r.boatName}</div>
                            <span style={styles.badge}>{String(r.status).toUpperCase()}</span>
                          </div>

                          <div style={{ opacity: 0.85, fontSize: 13 }}>
                            {fmt(r.startDate)} → {fmt(r.endExclusive)}
                          </div>

                          <div style={{ fontSize: 13 }}>
                            <b>{r.requesterName || "—"}</b>{" "}
                            <span style={{ opacity: 0.7 }}>
                              {r.requesterEmail ? `• ${r.requesterEmail}` : ""}
                            </span>
                          </div>

                          <div style={{ opacity: 0.5, fontSize: 12 }}>
                            <span style={{ fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace" }}>
                              {r.id}
                            </span>
                          </div>
                        </div>

                        <div style={styles.actions}>
                          <button
                            style={styles.primary}
                            disabled={!isPending || busyId === r.id}
                            onClick={() => act(r.id, "approve")}
                          >
                            {busyId === r.id ? "Working…" : "Approve"}
                          </button>
                          <button
                            style={styles.btn}
                            disabled={!isPending || busyId === r.id}
                            onClick={() => act(r.id, "deny")}
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" },
  header: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  h1: { fontSize: 20, fontWeight: 900 },
  sub: { marginTop: 4, opacity: 0.7, fontSize: 13 },
  code: { padding: "2px 6px", borderRadius: 6, background: "#f3f4f6" },

  card: {
    marginTop: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    background: "white",
  },

  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "end",
  },

  label: { display: "grid", gap: 6, fontSize: 13, minWidth: 160 },
  input: { padding: 10, borderRadius: 10, border: "1px solid #d1d5db" },

  checkboxRow: { display: "flex", gap: 8, alignItems: "center", fontSize: 13 },

  row: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    background: "white",
  },

  badge: {
    fontSize: 12,
    padding: "2px 10px",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    opacity: 0.9,
  },

  actions: { display: "flex", gap: 8, alignItems: "center" },

  btn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
  },

  primary: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #111827",
    background: "#111827",
    color: "white",
    cursor: "pointer",
  },

  error: { padding: 12, borderRadius: 12, background: "#fee2e2", color: "#7f1d1d" },

  calendarWrap: {
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "white",
  },
};
