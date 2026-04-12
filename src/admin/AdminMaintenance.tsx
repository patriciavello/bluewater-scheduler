import React, { useEffect, useState } from "react";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

const TOKEN_KEY = "ADMIN_JWT";

type MaintenanceRequest = {
  id: string;
  boatId: string;
  boatName: string;
  submittedByUserId?: string | null;
  submittedByName?: string | null;
  submittedByEmail?: string | null;
  notes?: string | null;
  status: string;
  adminDecisionNote?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type MaintenanceItem = {
  id: string;
  maintenanceRequestId: string;
  problemDescription: string;
  classification: string;
  outOfServiceRequired: boolean;
  requiredFixDate?: string | null;
  priority: string;
  status: string;
  technicianUserId?: string | null;
  scheduledStartDate?: string | null;
  scheduledEndDate?: string | null;
  supervisorNote?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export default function AdminMaintenance() {
  const token = localStorage.getItem(TOKEN_KEY) || "";

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/maintenance/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load requests");
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  async function openRequest(requestId: string) {
    if (!token) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/maintenance/requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load request details");

      setSelected(data.request);
      setItems(Array.isArray(data.items) ? data.items : []);
      setDecisionNote(data.request?.adminDecisionNote || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load request details");
    }
  }

  async function approveRequest(id: string) {
    if (!token) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/maintenance/requests/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to approve");

      await loadRequests();
      await openRequest(id);
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
    } finally {
      setBusyId("");
    }
  }

  async function denyRequest(id: string) {
    if (!token) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/maintenance/requests/${id}/deny`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: decisionNote }),
      });
      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to deny");

      await loadRequests();
      await openRequest(id);
    } catch (e: any) {
      setError(e?.message || "Failed to deny");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        <section style={styles.listPane}>
          <div style={styles.sectionTitle}>Maintenance Requests</div>

          {loading ? <div>Loading…</div> : null}
          {error ? <div style={styles.error}>{error}</div> : null}

          <div style={{ display: "grid", gap: 10 }}>
            {requests.map((r) => (
              <button
                key={r.id}
                style={{
                  ...styles.requestCard,
                  borderColor: selected?.id === r.id ? "#111827" : "#e5e7eb",
                }}
                onClick={() => openRequest(r.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{r.boatName}</strong>
                  <span style={styles.badge}>{r.status}</span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
                  {r.submittedByName || "—"} {r.submittedByEmail ? `• ${r.submittedByEmail}` : ""}
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section style={styles.detailPane}>
          {!selected ? (
            <div style={{ opacity: 0.7 }}>Select a maintenance request.</div>
          ) : (
            <>
              <div style={styles.sectionTitle}>Request Details</div>

              <div style={styles.card}>
                <div><b>Boat:</b> {selected.boatName}</div>
                <div><b>Status:</b> {selected.status}</div>
                <div><b>Submitted by:</b> {selected.submittedByName || "—"}</div>
                <div><b>Email:</b> {selected.submittedByEmail || "—"}</div>
                <div><b>Notes:</b> {selected.notes || "—"}</div>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {items.map((item, index) => (
                  <div key={item.id} style={styles.card}>
                    <div style={{ fontWeight: 800 }}>Problem #{index + 1}</div>
                    <div><b>Description:</b> {item.problemDescription}</div>
                    <div><b>Classification:</b> {item.classification}</div>
                    <div><b>Priority:</b> {item.priority}</div>
                    <div><b>Out of service:</b> {item.outOfServiceRequired ? "Yes" : "No"}</div>
                    <div><b>Required fix date:</b> {item.requiredFixDate || "—"}</div>
                    <div><b>Item status:</b> {item.status}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={styles.label}>
                  <span>Deny note (optional)</span>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  style={styles.primary}
                  disabled={busyId === selected.id || selected.status === "APPROVED"}
                  onClick={() => approveRequest(selected.id)}
                >
                  {busyId === selected.id ? "Working…" : "Approve"}
                </button>

                <button
                  style={styles.btn}
                  disabled={busyId === selected.id || selected.status === "DENIED"}
                  onClick={() => denyRequest(selected.id)}
                >
                  Deny
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 16,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 16,
  },
  listPane: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    background: "white",
  },
  detailPane: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    background: "white",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 12,
  },
  requestCard: {
    textAlign: "left",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "white",
    padding: 12,
    cursor: "pointer",
  },
  badge: {
    fontSize: 12,
    padding: "2px 10px",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#fafafa",
    display: "grid",
    gap: 6,
  },
  label: {
    display: "grid",
    gap: 6,
    fontSize: 13,
  },
  input: {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    font: "inherit",
  },
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
    fontWeight: 700,
  },
  error: {
    padding: 12,
    borderRadius: 12,
    background: "#fee2e2",
    color: "#991b1b",
    marginBottom: 12,
  },
};