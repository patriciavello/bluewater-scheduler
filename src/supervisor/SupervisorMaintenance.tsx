import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

const TOKEN_KEY = "ADMIN_JWT";

type Item = {
  id: string;
  maintenanceRequestId?: string;
  requestStatus?: string;
  boatName: string;
  problemDescription: string;
  classification: string;
  priority: string;
  outOfServiceRequired: boolean;
  requiredFixDate?: string | null;
  status: string;
  technicianUserId?: string | null;
  scheduledStartDate?: string | null;
  scheduledEndDate?: string | null;
};

type Technician = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export default function SupervisorMaintenance() {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const navigate = useNavigate();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  useEffect(() => {
    loadItems();
    loadTechnicians();
  }, []);

  function toYMD(value?: string | null) {
    if (!value) return "";
    const s = String(value);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }

  async function loadItems() {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/supervisor/maintenance/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await safeJson(res);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load items");
      }

      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function updateItem(id: string, patch: Partial<Item>) {
    setBusyId(id);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/supervisor/maintenance/items/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      const data = await safeJson(res);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Update failed");
      }

      await loadItems();
    } catch (e: any) {
      setError(e?.message || "Update failed");
    } finally {
      setBusyId("");
    }
  }

  async function loadTechnicians() {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/role-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await safeJson(res);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load technicians");
      }

      const techs = (data.users || []).filter((u: any) => !!u.isTechnician);
      setTechnicians(techs);
    } catch (e: any) {
      setError(e?.message || "Failed to load technicians");
    }
  }

  return (
    <div style={styles.page}>
      <h2>Supervisor Maintenance</h2>

      {loading ? <div>Loading…</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.tableWrap}>
        <div style={styles.table}>
          <div style={styles.headerRow}>
            <div>Boat</div>
            <div>Problem</div>
            <div>Request</div>
            <div>Priority</div>
            <div>Out</div>
            <div>Fix By</div>
            <div>Technician</div>
            <div>Start</div>
            <div>End</div>
            <div>Status / Open</div>
          </div>

          {items.map((i) => {
            const isApproved = i.requestStatus === "APPROVED";

            return (
              <React.Fragment key={i.id}>
                <div style={styles.row}>
                  <div>{i.boatName}</div>
                  <div>{i.problemDescription}</div>

                  <div>
                    <span
                      style={{
                        ...styles.requestBadge,
                        background:
                          i.requestStatus === "APPROVED" ? "#dcfce7" : "#fef3c7",
                        color:
                          i.requestStatus === "APPROVED" ? "#166534" : "#92400e",
                        borderColor:
                          i.requestStatus === "APPROVED" ? "#86efac" : "#fcd34d",
                      }}
                    >
                      {i.requestStatus || "UNKNOWN"}
                    </span>
                  </div>

                  <div>{i.priority}</div>
                  <div>{i.outOfServiceRequired ? "YES" : "NO"}</div>
                  <div>{i.requiredFixDate || "—"}</div>

                  <div>
                    <select
                      style={styles.input}
                      value={i.technicianUserId || ""}
                      onChange={(e) =>
                        updateItem(i.id, {
                          technicianUserId: e.target.value || null,
                        })
                      }
                      disabled={busyId === i.id || !isApproved}
                    >
                      <option value="">Select technician</option>
                      {technicians.map((t) => {
                        const label =
                          `${t.firstName || ""} ${t.lastName || ""}`.trim() || t.email;
                        return (
                          <option key={t.id} value={t.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <input
                      type="date"
                      style={styles.input}
                      value={toYMD(i.scheduledStartDate)}
                      onChange={(e) => {
                        const val = e.target.value;

                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === i.id ? { ...x, scheduledStartDate: val } : x
                          )
                        );

                        updateItem(i.id, { scheduledStartDate: val });
                      }}
                      disabled={busyId === i.id || !isApproved}
                    />
                  </div>

                  <div>
                    <input
                      type="date"
                      style={styles.input}
                      value={toYMD(i.scheduledEndDate)}
                      onChange={(e) => {
                        const val = e.target.value;

                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === i.id ? { ...x, scheduledEndDate: val } : x
                          )
                        );

                        updateItem(i.id, { scheduledEndDate: val });
                      }}
                      disabled={busyId === i.id || !isApproved}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <select
                      style={styles.input}
                      value={i.status}
                      onChange={(e) =>
                        updateItem(i.id, { status: e.target.value })
                      }
                      disabled={busyId === i.id || !isApproved}
                    >
                      <option value="OPEN">Waiting for Approval</option>
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </select>

                    <button
                      style={styles.openBtn}
                      onClick={() => navigate(`/technician/maintenance/${i.id}`)}
                    >
                      See Details
                    </button>
                  </div>
                </div>

                {!isApproved ? (
                  <div style={styles.pendingHintRow}>
                    <div style={styles.pendingHint}>
                      Waiting for request approval
                    </div>
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 16 },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    display: "grid",
    gap: 8,
    marginTop: 16,
    minWidth: 1300,
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 120px 80px 60px 100px 160px 120px 120px 160px",
    gap: 8,
    fontWeight: 800,
    alignItems: "center",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 120px 80px 60px 100px 160px 120px 120px 160px",
    gap: 8,
    alignItems: "center",
  },
  pendingHintRow: {
    marginTop: -4,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: 6,
    boxSizing: "border-box",
  },
  openBtn: {
    width: "100%",
    padding: 6,
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
  },
  requestBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  pendingHint: {
    fontSize: 12,
    color: "#92400e",
    background: "#fff7ed",
    border: "1px solid #fdba74",
    borderRadius: 8,
    padding: "6px 10px",
    display: "inline-block",
  },
  error: {
    color: "red",
  },
};