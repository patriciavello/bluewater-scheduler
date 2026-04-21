import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

const TOKEN_KEY = "ADMIN_JWT";

type EventItem = {
  id: string;
  parentEventId?: string | null;
  boatId: string;
  boatName?: string;
  title: string;
  eventType: "TRAINING" | "FLOTILLA" | "SAILING_TOUR";
  description?: string | null;
  imageUrl?: string | null;
  startDate: string;
  endExclusive: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "CLOSED";
  maxParticipants: number;
  currentParticipants: number;
  changeNotice?: string | null;
  cancelledAt?: string | null;
  createdByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type EventVariation = {
  id?: string;
  eventId?: string;
  name: string;
  description?: string | null;
  price: number | string;
  capacity: number | string;
  participantsCount: number | string;
  sortOrder: number | string;
};

type Boat = {
  id: string;
  name: string;
};

type EventBooking = {
  id: string;
  variationName?: string;
  userEmail?: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  participantsCount: number;
  status: string;
  amountPaid?: number | null;
  createdAt?: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function toYMD(v?: string | null) {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function emptyVariation(sortOrder: number): EventVariation {
  return {
    name: "",
    description: "",
    price: "",
    capacity: "",
    participantsCount: "",
    sortOrder,
  };
}

function emptyForm() {
  return {
    id: "",
    boatId: "",
    title: "",
    eventType: "TRAINING" as "TRAINING" | "FLOTILLA" | "SAILING_TOUR",
    description: "",
    imageUrl: "",
    startDate: "",
    endExclusive: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED" | "CANCELLED" | "CLOSED",
    maxParticipants: 1,
    changeNotice: "",
    variations: [emptyVariation(1)],
  };
}

export default function AdminEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState(emptyForm());

  const [cloneMode, setCloneMode] = useState(false);
  const [cloneBoatId, setCloneBoatId] = useState("");
  const [cloneStartDate, setCloneStartDate] = useState("");
  const [cloneEndExclusive, setCloneEndExclusive] = useState("");
  const [cloneStatus, setCloneStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");

  const [cancelMode, setCancelMode] = useState(false);
  const [cancelRefundMode, setCancelRefundMode] = useState<"FULL_REFUND" | "USER_CONFIRMATION_REQUIRED">("FULL_REFUND");
  const [cancelMessage, setCancelMessage] = useState("");

  useEffect(() => {
    loadEvents();
    loadBoats();
  }, []);

  async function loadEvents() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/events`, {
        headers: authHeaders(),
      });
      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load events");
      setEvents(data.events || []);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function loadBoats() {
    try {
      const res = await fetch(`${API_BASE}/api/boats`);
      const data = await safeJson(res);
      const rows = data.boats || data.items || data || [];
      if (Array.isArray(rows)) {
        setBoats(
          rows.map((b: any) => ({
            id: b.id,
            name: b.name,
          }))
        );
      }
    } catch {
      // leave empty if boats fail
    }
  }

  async function loadEventDetail(id: string) {
    if (!id) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${id}`, {
        headers: authHeaders(),
      });
      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load event");

      const event = data.event;
      const variations = (data.variations || []).map((v: any) => ({
        id: v.id,
        eventId: v.eventId,
        name: v.name || "",
        description: v.description || "",
        price: v.price ?? "",
        capacity: v.capacity ?? "",
        participantsCount: v.participantsCount ?? "",
        sortOrder: v.sortOrder ?? 1,
      }));

      setForm({
        id: event.id,
        boatId: event.boatId || "",
        title: event.title || "",
        eventType: event.eventType || "TRAINING",
        description: event.description || "",
        imageUrl: event.imageUrl || "",
        startDate: toYMD(event.startDate),
        endExclusive: toYMD(event.endExclusive),
        status: event.status || "DRAFT",
        maxParticipants: event.maxParticipants || 1,
        changeNotice: event.changeNotice || "",
        variations: variations.length ? variations : [emptyVariation(1)],
      });

      setBookings(data.bookings || []);
      setSelectedEventId(id);
      setCloneBoatId(event.boatId || "");
      setCloneStartDate(toYMD(event.startDate));
      setCloneEndExclusive(toYMD(event.endExclusive));
      setCloneStatus("DRAFT");
    } catch (e: any) {
      setMsg(e?.message || "Failed to load event detail");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm());
    setBookings([]);
    setSelectedEventId("");
    setCloneMode(false);
    setCancelMode(false);
    setMsg("");
  }

  function updateVariation(index: number, patch: Partial<EventVariation>) {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  function addVariation() {
    setForm((prev) => ({
      ...prev,
      variations: [...prev.variations, emptyVariation(prev.variations.length + 1)],
    }));
  }

  function removeVariation(index: number) {
    setForm((prev) => ({
      ...prev,
      variations:
        prev.variations.length === 1
          ? [emptyVariation(1)]
          : prev.variations
              .filter((_, i) => i !== index)
              .map((v, i) => ({ ...v, sortOrder: i + 1 })),
    }));
  }

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  async function saveEvent() {
    setSaving(true);
    setMsg("");

    try {
      const payload: any = {
        boatId: form.boatId,
        title: form.title,
        eventType: form.eventType,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        startDate: form.startDate,
        endExclusive: form.endExclusive,
        status: form.status,
        maxParticipants: Number(form.maxParticipants),
        changeNotice: form.changeNotice || null,
      };

      const normalizedVariations = form.variations.map((v, i) => ({
        name: v.name,
        description: v.description || null,
        price: Number(v.price),
        capacity: Number(v.capacity),
        participantsCount: Number(v.participantsCount),
        sortOrder: Number(v.sortOrder || i + 1),
      }));

      let res: Response;
      let data: any;

      if (!form.id) {
        payload.variations = normalizedVariations;
        res = await fetch(`${API_BASE}/api/admin/events`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        data = await safeJson(res);
      } else {
        res = await fetch(`${API_BASE}/api/admin/events/${form.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        data = await safeJson(res);
      }

      if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");

      setMsg(form.id ? "Event updated ✅" : "Event created ✅");
      await loadEvents();

      if (data.event?.id) {
        await loadEventDetail(data.event.id);
      }
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publishEvent() {
    if (!form.id) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${form.id}/publish`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || "Publish failed");

      setMsg("Event published ✅");
      await loadEvents();
      await loadEventDetail(form.id);
    } catch (e: any) {
      setMsg(e?.message || "Publish failed");
    } finally {
      setSaving(false);
    }
  }

  async function cloneEvent() {
    if (!form.id) return;
    setSaving(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${form.id}/clone`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          boatId: cloneBoatId,
          startDate: cloneStartDate,
          endExclusive: cloneEndExclusive,
          status: cloneStatus,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || "Clone failed");

      setMsg("Event cloned ✅");
      setCloneMode(false);
      await loadEvents();
      if (data.event?.id) {
        await loadEventDetail(data.event.id);
      }
    } catch (e: any) {
      setMsg(e?.message || "Clone failed");
    } finally {
      setSaving(false);
    }
  }

  async function cancelEvent() {
    if (!form.id) return;
    setSaving(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/events/${form.id}/cancel`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          refundMode: cancelRefundMode,
          message: cancelMessage || null,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || "Cancel failed");

      setMsg(data.message || "Event cancelled ✅");
      setCancelMode(false);
      await loadEvents();
      await loadEventDetail(form.id);
    } catch (e: any) {
      setMsg(e?.message || "Cancel failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Events</h2>
          <div style={styles.subtle}>
            Create, edit, publish, clone, and cancel flotillas, sailing tours, and training events.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={loadEvents} disabled={loading}>
            Refresh
          </button>
          <button style={styles.primary} onClick={resetForm}>
            + New Event
          </button>
        </div>
      </div>

      {msg ? <div style={styles.msg}>{msg}</div> : null}

      <div style={styles.layout}>
        <div style={styles.leftPane}>
          <div style={styles.card}>
            <div style={styles.sectionHead}>Events</div>

            {loading ? (
              <div style={styles.subtle}>Loading…</div>
            ) : events.length === 0 ? (
              <div style={styles.subtle}>No events yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {events.map((e) => (
                  <button
                    key={e.id}
                    style={{
                      ...styles.eventCard,
                      borderColor: selectedEventId === e.id ? "#111827" : "#e5e7eb",
                    }}
                    onClick={() => loadEventDetail(e.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontWeight: 800, textAlign: "left" }}>{e.title}</div>
                      <div style={statusPill(e.status)}>{e.status}</div>
                    </div>
                    <div style={styles.subtleRow}>{e.eventType} · {e.boatName || "Boat"}</div>
                    <div style={styles.subtleRow}>
                      {toYMD(e.startDate)} → {toYMD(e.endExclusive)}
                    </div>
                    <div style={styles.subtleRow}>
                      {e.currentParticipants || 0}/{e.maxParticipants || 0} participants
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.rightPane}>
          <div style={styles.card}>
            <div style={styles.sectionHead}>
              {form.id ? "Edit Event" : "Create Event"}
            </div>

            <div style={styles.grid2}>
              <label style={styles.label}>
                <span>Boat</span>
                <select
                  style={styles.input}
                  value={form.boatId}
                  onChange={(e) => setForm((p) => ({ ...p, boatId: e.target.value }))}
                >
                  <option value="">Select boat</option>
                  {boats.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                <span>Event Type</span>
                <select
                  style={styles.input}
                  value={form.eventType}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      eventType: e.target.value as "TRAINING" | "FLOTILLA" | "SAILING_TOUR",
                    }))
                  }
                >
                  <option value="TRAINING">TRAINING</option>
                  <option value="FLOTILLA">FLOTILLA</option>
                  <option value="SAILING_TOUR">Sailing Tour</option>
                </select>
              </label>
            </div>

            <label style={styles.label}>
              <span>Title</span>
              <input
                style={styles.input}
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </label>

            <label style={styles.label}>
              <span>Description</span>
              <textarea
                style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </label>

            <label style={styles.label}>
              <span>Image URL</span>
              <input
                style={styles.input}
                value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </label>

            <div style={styles.grid4}>
              <label style={styles.label}>
                <span>Start Date</span>
                <input
                  type="date"
                  style={styles.input}
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </label>

              <label style={styles.label}>
                <span>End Exclusive</span>
                <input
                  type="date"
                  style={styles.input}
                  value={form.endExclusive}
                  onChange={(e) => setForm((p) => ({ ...p, endExclusive: e.target.value }))}
                />
              </label>

              <label style={styles.label}>
                <span>Status</span>
                <select
                  style={styles.input}
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      status: e.target.value as "DRAFT" | "PUBLISHED" | "CANCELLED" | "CLOSED",
                    }))
                  }
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </label>

              <label style={styles.label}>
                <span>Max Participants</span>
                <input
                  type="number"
                  min={1}
                  style={styles.input}
                  value={form.maxParticipants}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, maxParticipants: Number(e.target.value || 1) }))
                  }
                />
              </label>
            </div>

            <label style={styles.label}>
              <span>Change Notice</span>
              <input
                style={styles.input}
                value={form.changeNotice}
                onChange={(e) => setForm((p) => ({ ...p, changeNotice: e.target.value }))}
                placeholder="Optional admin note shown when event changes"
              />
            </label>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionHead}>Pricing Variations</div>

            <div style={{ display: "grid", gap: 10 }}>
              {form.variations.map((v, idx) => (
                <div key={idx} style={styles.variationCard}>
                  <div style={styles.grid4}>
                    <label style={styles.label}>
                      <span>Name</span>
                      <input
                        style={styles.input}
                        value={v.name}
                        onChange={(e) => updateVariation(idx, { name: e.target.value })}
                      />
                    </label>

                    <label style={styles.label}>
                      <span>Price</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        style={styles.input}
                        value={v.price}
                        onChange={(e) => updateVariation(idx, { price: e.target.value })}
                      />
                    </label>

                    <label style={styles.label}>
                      <span>Capacity</span>
                      <input
                        type="number"
                        min="1"
                        style={styles.input}
                        value={v.capacity}
                        onChange={(e) => updateVariation(idx, { capacity: e.target.value })}
                      />
                    </label>

                    <label style={styles.label}>
                      <span>Participants Count</span>
                      <input
                        type="number"
                        min="1"
                        style={styles.input}
                        value={v.participantsCount}
                        onChange={(e) =>
                          updateVariation(idx, { participantsCount: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  <label style={styles.label}>
                    <span>Description</span>
                    <input
                      style={styles.input}
                      value={v.description || ""}
                      onChange={(e) => updateVariation(idx, { description: e.target.value })}
                    />
                  </label>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={styles.subtle}>Variation #{idx + 1}</div>
                    <button style={styles.btn} onClick={() => removeVariation(idx)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10 }}>
              <button style={styles.btn} onClick={addVariation}>
                + Add Variation
              </button>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionHead}>Actions</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={styles.primary} onClick={saveEvent} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Save Event" : "Create Event"}
              </button>

              {form.id ? (
                <>
                  <button style={styles.btn} onClick={publishEvent} disabled={saving}>
                    Publish
                  </button>

                  <button
                    style={styles.btn}
                    onClick={() => {
                      setCloneMode((v) => !v);
                      setCancelMode(false);
                    }}
                  >
                    Clone
                  </button>

                  <button
                    style={styles.btnDanger}
                    onClick={() => {
                      setCancelMode((v) => !v);
                      setCloneMode(false);
                    }}
                  >
                    Cancel Event
                  </button>
                </>
              ) : null}
            </div>

            {cloneMode && form.id ? (
              <div style={styles.subCard}>
                <div style={styles.sectionHeadSmall}>Clone Event</div>

                <div style={styles.grid4}>
                  <label style={styles.label}>
                    <span>Boat</span>
                    <select
                      style={styles.input}
                      value={cloneBoatId}
                      onChange={(e) => setCloneBoatId(e.target.value)}
                    >
                      <option value="">Select boat</option>
                      {boats.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={styles.label}>
                    <span>Start Date</span>
                    <input
                      type="date"
                      style={styles.input}
                      value={cloneStartDate}
                      onChange={(e) => setCloneStartDate(e.target.value)}
                    />
                  </label>

                  <label style={styles.label}>
                    <span>End Exclusive</span>
                    <input
                      type="date"
                      style={styles.input}
                      value={cloneEndExclusive}
                      onChange={(e) => setCloneEndExclusive(e.target.value)}
                    />
                  </label>

                  <label style={styles.label}>
                    <span>Status</span>
                    <select
                      style={styles.input}
                      value={cloneStatus}
                      onChange={(e) =>
                        setCloneStatus(e.target.value as "DRAFT" | "PUBLISHED")
                      }
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                    </select>
                  </label>
                </div>

                <button style={styles.primary} onClick={cloneEvent} disabled={saving}>
                  Clone Now
                </button>
              </div>
            ) : null}

            {cancelMode && form.id ? (
              <div style={styles.subCard}>
                <div style={styles.sectionHeadSmall}>Cancel Event</div>

                <label style={styles.label}>
                  <span>Refund Mode</span>
                  <select
                    style={styles.input}
                    value={cancelRefundMode}
                    onChange={(e) =>
                      setCancelRefundMode(
                        e.target.value as "FULL_REFUND" | "USER_CONFIRMATION_REQUIRED"
                      )
                    }
                  >
                    <option value="FULL_REFUND">FULL_REFUND</option>
                    <option value="USER_CONFIRMATION_REQUIRED">
                      USER_CONFIRMATION_REQUIRED
                    </option>
                  </select>
                </label>

                <label style={styles.label}>
                  <span>Message</span>
                  <textarea
                    style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
                    value={cancelMessage}
                    onChange={(e) => setCancelMessage(e.target.value)}
                  />
                </label>

                <button style={styles.btnDanger} onClick={cancelEvent} disabled={saving}>
                  Confirm Cancel Event
                </button>
              </div>
            ) : null}
          </div>

          {selectedEvent ? (
            <div style={styles.card}>
              <div style={styles.sectionHead}>Bookings</div>

              {bookings.length === 0 ? (
                <div style={styles.subtle}>No bookings yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {bookings.map((b) => (
                    <div key={b.id} style={styles.bookingCard}>
                      <div style={{ fontWeight: 700 }}>
                        {b.variationName || "Variation"}
                      </div>
                      <div style={styles.subtleRow}>
                        {[b.userFirstName, b.userLastName].filter(Boolean).join(" ") ||
                          b.userEmail ||
                          "Unknown user"}
                      </div>
                      <div style={styles.subtleRow}>
                        Participants: {b.participantsCount} · Status: {b.status}
                      </div>
                      <div style={styles.subtleRow}>
                        Amount Paid: {b.amountPaid ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function statusPill(status: string): React.CSSProperties {
  const bg =
    status === "PUBLISHED"
      ? "#dcfce7"
      : status === "CANCELLED"
      ? "#fee2e2"
      : status === "CLOSED"
      ? "#e5e7eb"
      : "#fef3c7";

  const color =
    status === "PUBLISHED"
      ? "#166534"
      : status === "CANCELLED"
      ? "#991b1b"
      : status === "CLOSED"
      ? "#374151"
      : "#92400e";

  return {
    background: bg,
    color,
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 16,
    display: "grid",
    gap: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  subtle: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 4,
  },
  subtleRow: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
    textAlign: "left",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 16,
    alignItems: "start",
  },
  leftPane: {
    display: "grid",
    gap: 16,
  },
  rightPane: {
    display: "grid",
    gap: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
  },
  subCard: {
    marginTop: 14,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 14,
    display: "grid",
    gap: 10,
  },
  sectionHead: {
    fontWeight: 800,
    marginBottom: 12,
    fontSize: 18,
  },
  sectionHeadSmall: {
    fontWeight: 700,
    marginBottom: 4,
    fontSize: 16,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  label: {
    display: "grid",
    gap: 6,
    fontSize: 13,
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
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
  btnDanger: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #dc2626",
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  msg: {
    padding: 12,
    borderRadius: 12,
    background: "#f3f4f6",
  },
  eventCard: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    padding: 12,
    cursor: "pointer",
  },
  variationCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gap: 10,
  },
  bookingCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
  },
};