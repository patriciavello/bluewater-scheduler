import React, { useEffect, useState } from "react";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

const TOKEN_KEY = "ADMIN_JWT"; // same token for now

type Item = {
  id: string;
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

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadItems();
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
      const res = await fetch(
        `${API_BASE}/api/supervisor/maintenance/items/${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        }
      );

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

  return (
    <div style={styles.page}>
      <h2>Supervisor Maintenance</h2>

      {loading ? <div>Loading…</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.table}>
        <div style={styles.headerRow}>
          <div>Boat</div>
          <div>Problem</div>
          <div>Priority</div>
          <div>Out</div>
          <div>Fix By</div>
          <div>Technician</div>
          <div>Start</div>
          <div>End</div>
          <div>Status</div>
        </div>

        {items.map((i) => (
          <div key={i.id} style={styles.row}>
            <div>{i.boatName}</div>
            <div>{i.problemDescription}</div>
            <div>{i.priority}</div>
            <div>{i.outOfServiceRequired ? "YES" : "NO"}</div>
            <div>{i.requiredFixDate || "—"}</div>

            <div>
              <input
                style={styles.input}
                value={i.technicianUserId || ""}
                placeholder="tech id"
                onChange={(e) =>
                  updateItem(i.id, { technicianUserId: e.target.value })
                }
                disabled={busyId === i.id}
              />
            </div>

            <div>
            <input
              type="date"
              style={styles.input}
              value={toYMD(i.scheduledStartDate)}
              onChange={(e) =>
                updateItem(i.id, { scheduledStartDate: e.target.value })
              }
              disabled={busyId === i.id}
            />
            </div>

            <div>
            <input
              type="date"
              style={styles.input}
              value={toYMD(i.scheduledEndDate)}
              onChange={(e) =>
                updateItem(i.id, { scheduledEndDate: e.target.value })
              }
              disabled={busyId === i.id}
            />
            </div>

            <div>
              <select
                style={styles.input}
                value={i.status}
                onChange={(e) =>
                  updateItem(i.id, { status: e.target.value })
                }
                disabled={busyId === i.id}
              >
                <option value="OPEN">OPEN</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 16 },
  table: {
    display: "grid",
    gap: 8,
    marginTop: 16,
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 80px 60px 100px 120px 120px 120px 120px",
    fontWeight: 800,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 80px 60px 100px 120px 120px 120px 120px",
    gap: 8,
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: 6,
  },
  error: {
    color: "red",
  },
};