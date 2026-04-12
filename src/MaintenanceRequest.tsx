import React, { useEffect, useState } from "react";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

type Boat = {
  id: string;
  name: string;
  purpose?: string | null;
};

type MaintenanceItem = {
  problemDescription: string;
  classification: "MECHANICAL" | "ELECTRICAL" | "PLUMBING" | "AC" | "OTHER";
  outOfServiceRequired: boolean;
  requiredFixDate: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  const method = (init.method || "GET").toUpperCase();
  const hasBody = init.body != null && method !== "GET" && method !== "HEAD";

  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  const data = await safeJson(res);
  return { res, data };
}

function emptyItem(): MaintenanceItem {
  return {
    problemDescription: "",
    classification: "MECHANICAL",
    outOfServiceRequired: false,
    requiredFixDate: "",
    priority: "MEDIUM",
  };
}

export default function MaintenanceRequest() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loadingBoats, setLoadingBoats] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [boatId, setBoatId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<MaintenanceItem[]>([emptyItem()]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    loadBoats();
  }, []);

  async function loadBoats() {
    setLoadingBoats(true);
    setErr("");
    try {
      const { res, data } = await apiFetch("/api/boats", { method: "GET" });
      if (!res.ok) throw new Error(data.error || "Failed to load boats");

      const mapped = (data.boats || []).map((b: any) => ({
        id: String(b.id),
        name: b.name,
        purpose: b.purpose ?? null,
      }));

      setBoats(mapped);
    } catch (e: any) {
      setErr(e?.message || "Failed to load boats");
    } finally {
      setLoadingBoats(false);
    }
  }

  function updateItem(index: number, patch: Partial<MaintenanceItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!boatId) {
      setErr("Please select a boat.");
      return;
    }

    const cleanedItems = items.map((item) => ({
      ...item,
      problemDescription: item.problemDescription.trim(),
      requiredFixDate: item.requiredFixDate || "",
    }));

    if (cleanedItems.some((item) => !item.problemDescription)) {
      setErr("Each problem needs a description.");
      return;
    }

    setSubmitting(true);
    try {
      const { res, data } = await apiFetch("/api/maintenance/requests", {
        method: "POST",
        body: JSON.stringify({
          boatId,
          notes: notes.trim() || null,
          items: cleanedItems,
        }),
      });

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit maintenance request");
      }

      setMsg("Maintenance request submitted successfully. It is waiting for admin approval.");
      setBoatId("");
      setNotes("");
      setItems([emptyItem()]);
    } catch (e: any) {
      setErr(e?.message || "Failed to submit maintenance request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={{ marginTop: 0 }}>Maintenance Request</h2>
        <div style={{ opacity: 0.75, marginBottom: 14 }}>
          Report one or more boat problems for admin review.
        </div>

        <form onSubmit={submit} style={styles.card}>
          <label style={styles.label}>
            <span>Boat</span>
            <select
              style={styles.input}
              value={boatId}
              onChange={(e) => setBoatId(e.target.value)}
              disabled={loadingBoats || submitting}
            >
              <option value="">Select a boat</option>
              {boats.map((boat) => (
                <option key={boat.id} value={boat.id}>
                  {boat.name}
                  {boat.purpose ? ` (${boat.purpose})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            <span>General notes</span>
            <textarea
              style={{ ...styles.input, minHeight: 90 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional overall notes about the maintenance request"
              disabled={submitting}
            />
          </label>

          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item, index) => (
              <div key={index} style={styles.problemCard}>
                <div style={styles.problemHeader}>
                  <strong>Problem #{index + 1}</strong>
                  <button
                    type="button"
                    style={styles.btn}
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1 || submitting}
                  >
                    Remove
                  </button>
                </div>

                <label style={styles.label}>
                  <span>Problem description</span>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    value={item.problemDescription}
                    onChange={(e) =>
                      updateItem(index, { problemDescription: e.target.value })
                    }
                    placeholder="Describe the issue"
                    disabled={submitting}
                  />
                </label>

                <div style={styles.grid2}>
                  <label style={styles.label}>
                    <span>Classification</span>
                    <select
                      style={styles.input}
                      value={item.classification}
                      onChange={(e) =>
                        updateItem(index, {
                          classification: e.target.value as MaintenanceItem["classification"],
                        })
                      }
                      disabled={submitting}
                    >
                      <option value="MECHANICAL">Mechanical</option>
                      <option value="ELECTRICAL">Electrical</option>
                      <option value="PLUMBING">Plumbing</option>
                      <option value="AC">AC</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>

                  <label style={styles.label}>
                    <span>Priority</span>
                    <select
                      style={styles.input}
                      value={item.priority}
                      onChange={(e) =>
                        updateItem(index, {
                          priority: e.target.value as MaintenanceItem["priority"],
                        })
                      }
                      disabled={submitting}
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </label>
                </div>

                <div style={styles.grid2}>
                  <label style={styles.label}>
                    <span>Required fix date</span>
                    <input
                      style={styles.input}
                      type="date"
                      value={item.requiredFixDate}
                      onChange={(e) =>
                        updateItem(index, { requiredFixDate: e.target.value })
                      }
                      disabled={submitting}
                    />
                  </label>

                  <label style={{ ...styles.label, justifyContent: "end" }}>
                    <span>Out of service until fixed</span>
                    <div style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={item.outOfServiceRequired}
                        onChange={(e) =>
                          updateItem(index, {
                            outOfServiceRequired: e.target.checked,
                          })
                        }
                        disabled={submitting}
                      />
                      <span>Yes</span>
                    </div>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={styles.btn}
              onClick={addItem}
              disabled={submitting}
            >
              + Add another problem
            </button>

            <button type="submit" style={styles.primary} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit maintenance request"}
            </button>
          </div>

          {msg ? <div style={styles.success}>{msg}</div> : null}
          {err ? <div style={styles.error}>{err}</div> : null}
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 16,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  container: {
    maxWidth: 900,
    margin: "0 auto",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    background: "white",
    display: "grid",
    gap: 14,
  },
  problemCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    background: "#fafafa",
    display: "grid",
    gap: 12,
  },
  problemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
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
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
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
  success: {
    padding: 12,
    borderRadius: 12,
    background: "#dcfce7",
    color: "#166534",
  },
  error: {
    padding: 12,
    borderRadius: 12,
    background: "#fee2e2",
    color: "#991b1b",
  },
};