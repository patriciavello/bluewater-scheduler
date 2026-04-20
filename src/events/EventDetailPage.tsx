import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

type EventItem = {
  id: string;
  boatId: string;
  boatName: string;
  title: string;
  eventType: "TRAINING" | "FLOTILLA";
  description?: string | null;
  imageUrl?: string | null;
  startDate: string;
  endExclusive: string;
  status: string;
  maxParticipants: number;
  currentParticipants: number;
  remainingParticipants: number;
};

type Variation = {
  id: string;
  eventId: string;
  name: string;
  description?: string | null;
  price: number;
  capacity: number;
  participantsCount: number;
  sortOrder: number;
  usedSlots: number;
  remainingSlots: number;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function parseDate(value: string) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toYmd(value: string) {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : value || "Unknown date";
}

function toDisplayRange(startDate: string, endExclusive: string) {
  const start = toYmd(startDate);
  const end = parseDate(endExclusive);
  if (!end) return `${start} → Unknown date`;
  end.setDate(end.getDate() - 1);
  return `${start} → ${end.toISOString().slice(0, 10)}`;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadEvent();
  }, [id]);

  async function loadEvent() {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/events/${id}`);
      const data = await safeJson(res);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load event");
      }

      setEvent(data.event || null);
      setVariations(data.variations || []);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load event");
    } finally {
      setLoading(false);
    }
  }

  async function bookVariation(variationId: string) {
    setSavingId(variationId);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/events/${id}/book`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ variationId }),
      });

      const data = await safeJson(res);

      if (res.status === 401) {
        throw new Error("Please sign in to book this event");
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Booking failed");
      }

      setMsg("Booking created ✅");
      await loadEvent();
    } catch (e: any) {
      setMsg(e?.message || "Booking failed");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div style={styles.page}>
      <div>
        <Link to="/events" style={{ textDecoration: "none" }}>
          <button style={styles.btn}>← Back to Events</button>
        </Link>
      </div>

      {msg ? <div style={styles.msg}>{msg}</div> : null}

      {loading ? (
        <div style={styles.subtle}>Loading…</div>
      ) : !event ? (
        <div style={styles.subtle}>Event not found.</div>
      ) : (
        <>
          <div style={styles.heroCard}>
            {event.imageUrl ? (
              <img src={event.imageUrl} alt={event.title} style={styles.heroImage} />
            ) : null}

            <div style={styles.heroContent}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>{event.title}</h2>
                <div style={styles.typeBadge}>{event.eventType}</div>
              </div>

              <div style={styles.subtleLine}>{event.boatName}</div>
              <div style={styles.subtleLine}>
                {toDisplayRange(event.startDate, event.endExclusive)}
              </div>
              <div style={styles.subtleLine}>
                Remaining spots: <b>{event.remainingParticipants}</b> of {event.maxParticipants}
              </div>

              {event.description ? (
                <div style={styles.description}>{event.description}</div>
              ) : null}

              <div style={styles.noteBox}>
                Event dates are fixed. You cannot change the dates when booking.
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Available Packages</div>

            {variations.length === 0 ? (
              <div style={styles.subtle}>No variations available.</div>
            ) : (
              <div style={styles.variationGrid}>
                {variations.map((v) => {
                  const soldOut = v.remainingSlots <= 0 || event.remainingParticipants <= 0;

                  return (
                    <div key={v.id} style={styles.variationCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontWeight: 800 }}>{v.name}</div>
                        <div style={styles.priceBadge}>${Number(v.price).toFixed(2)}</div>
                      </div>

                      {v.description ? (
                        <div style={styles.description}>{v.description}</div>
                      ) : null}

                      <div style={styles.subtleLine}>
                        Covers <b>{v.participantsCount}</b> participant(s)
                      </div>

                      <div style={styles.subtleLine}>
                        Remaining packages: <b>{v.remainingSlots}</b>
                      </div>

                      <button
                        style={soldOut ? styles.disabledBtn : styles.primary}
                        disabled={soldOut || savingId === v.id}
                        onClick={() => bookVariation(v.id)}
                      >
                        {savingId === v.id
                          ? "Booking..."
                          : soldOut
                          ? "Sold Out"
                          : "Book This Option"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: 16,
    display: "grid",
    gap: 16,
  },
  btn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
  },
  msg: {
    padding: 12,
    borderRadius: 12,
    background: "#f3f4f6",
  },
  subtle: {
    color: "#6b7280",
    fontSize: 14,
  },
  heroCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    background: "white",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    minHeight: 260,
    objectFit: "cover",
  },
  heroContent: {
    padding: 16,
    display: "grid",
    gap: 10,
  },
  typeBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontWeight: 700,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  subtleLine: {
    color: "#6b7280",
    fontSize: 14,
  },
  description: {
    color: "#111827",
    fontSize: 15,
  },
  noteBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    color: "#374151",
  },
  section: {
    display: "grid",
    gap: 12,
  },
  sectionTitle: {
    fontWeight: 900,
    fontSize: 20,
  },
  variationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  variationCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "white",
    display: "grid",
    gap: 10,
  },
  priceBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#166534",
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
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
  disabledBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#e5e7eb",
    color: "#6b7280",
    cursor: "not-allowed",
    fontWeight: 700,
  },
};
