import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
console.log("API_BASE:", API_BASE);

interface MaintenanceItem {
  id: string;
  title?: string;
  description?: string;
  problemDescription?: string;
  requestStatus?: string;
  status: string;
  priority: string;
  classification?: string;
  boatId?: string;
  boatName?: string;
  technicianUserId?: string;
  technicianFirstName?: string;
  technicianLastName?: string;
  technicianEmail?: string;
  requestedBy?: string;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  requiredFixDate?: string;
  completedAt?: string;
  notes?: string;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return "#f59e0b";
    case "ASSIGNED":
      return "#2563eb";
    case "WAITING_SUPERVISOR":
      return "#8b5cf6";
    case "DONE_PENDING_REVIEW":
      return "#0ea5e9";
    case "DONE":
      return "#16a34a";
    case "OPEN":
      return "#6b7280";
    default:
      return "#374151";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "HIGH":
      return "#dc2626";
    case "MEDIUM":
      return "#d97706";
    case "LOW":
      return "#16a34a";
    default:
      return "#374151";
  }
}

export default function TechnicianMaintenanceListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    setError("");

    try {
      console.log("API_BASE:", API_BASE);
      console.log("Fetching from:", `${API_BASE}/api/technician/maintenance/items`);
      
      const res = await fetch(`${API_BASE}/api/technician/maintenance/items`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        const text = await res.text();
        console.error("Response text:", text);
        throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
      }

      const text = await res.text();
      console.log("technician items raw response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 120)}`);
      }
      console.log("Response data:", data);

      if (!data.ok) {
        throw new Error(data?.error || "Failed to load maintenance items");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Error loading items:", err);
      setError((err as Error).message || "Failed to load maintenance items");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.centerBox}>Loading maintenance items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorBox}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Technician Maintenance</h1>
        <button style={styles.secondaryButton} onClick={loadItems}>
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div style={styles.card}>No maintenance items assigned.</div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <div key={item.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div
                  style={{
                    ...styles.badge,
                    backgroundColor: getStatusColor(item.status),
                  }}
                >
                  {item.status}
                </div>

                <div
                  style={{
                    ...styles.priority,
                    color: getPriorityColor(item.priority),
                  }}
                >
                  {item.priority}
                </div>
              </div>

              <div style={styles.problem}>{item.problemDescription}</div>

              <div style={styles.meta}><b>Request Status:</b> {item.requestStatus || "—"}</div>
              <div style={styles.meta}><b>Boat:</b> {item.boatName || "—"}</div>
              <div style={styles.meta}><b>Technician:</b> {item.technicianFirstName || item.technicianLastName ? `${[item.technicianFirstName, item.technicianLastName].filter(Boolean).join(" ")}` : item.technicianEmail || "—"}</div>
              <div style={styles.meta}><b>Classification:</b> {item.classification || "—"}</div>
              <div style={styles.meta}><b>Required Fix Date:</b> {formatDate(item.requiredFixDate)}</div>
              <div style={styles.meta}><b>Scheduled Start:</b> {formatDate(item.scheduledStartDate)}</div>
              <div style={styles.meta}><b>Scheduled End:</b> {formatDate(item.scheduledEndDate)}</div>

              <button
                style={styles.primaryButton}
                onClick={() => navigate(`/technician/maintenance/${item.id}`)}
              >
                Open Item
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 900,
    margin: "0 auto",
    padding: 16,
    background: "#f8fafc",
    minHeight: "100vh",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 28,
  },
  centerBox: {
    background: "#ffffff",
    borderRadius: 14,
    padding: 24,
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  card: {
    background: "#ffffff",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  badge: {
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  priority: {
    fontWeight: 700,
    fontSize: 14,
  },
  problem: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 12,
    color: "#111827",
  },
  meta: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },
  primaryButton: {
    marginTop: 14,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  secondaryButton: {
    background: "#ffffff",
    color: "#111827",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBox: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: 12,
    borderRadius: 10,
  },
};