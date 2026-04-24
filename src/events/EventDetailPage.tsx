import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { withUserAuthHeaders } from "../userAuth";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

type EventItem = {
  id: string;
  boatId: string;
  boatName: string;
  title: string;
  eventType: "TRAINING" | "FLOTILLA" | "SAILING_TOUR";
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

type MeResponse = {
  ok?: boolean;
  user?: {
    id?: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
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

function eventTypeLabel(type?: string) {
  if (type === "TRAINING") return "Training";
  if (type === "FLOTILLA") return "Flotilla";
  if (type === "SAILING_TOUR") return "Sailing Tour";
  return type || "Event";
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
      const meRes = await fetch(`${API_BASE}/api/me`, {
        method: "GET",
        credentials: "include",
        headers: withUserAuthHeaders(),
      });
      const meData: MeResponse = await safeJson(meRes);

      if (!meRes.ok || !meData?.ok || !meData?.user?.id) {
        throw new Error("Please sign in to book this event");
      }

      const requesterEmail = meData.user.email || "";
      const requesterName =
        `${meData.user.first_name || ""} ${meData.user.last_name || ""}`.trim() || "";

      const res = await fetch(`${API_BASE}/api/events/${id}/create-checkout-session`, {
        method: "POST",
        credentials: "include",
        headers: withUserAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          variationId,
          requesterEmail,
          requesterName,
        }),
      });

      const data = await safeJson(res);

      if (res.status === 401) {
        throw new Error("Please sign in to book this event");
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Booking failed");
      }

      if (!data.url) {
        throw new Error("Missing checkout URL");
      }

      window.location.href = data.url;
    } catch (e: any) {
      setMsg(e?.message || "Booking failed");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.topActions}>
        <Link to="/" style={styles.brandLink}>Bluewater Escapes</Link>
        <div style={styles.actionGroup}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <button style={styles.btn}>Calendar</button>
        </Link>
        <Link to="/events" style={{ textDecoration: "none" }}>
          <button style={styles.btn}>Back to Events</button>
        </Link>
        <Link to="/account" style={{ textDecoration: "none" }}>
          <button style={styles.btn}>My Account</button>
        </Link>
        </div>
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
                <div>
                  <div style={styles.eyebrow}>Experience</div>
                  <h1 style={styles.title}>{event.title}</h1>
                </div>
                <div style={styles.typeBadge}>{eventTypeLabel(event.eventType)}</div>
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
                  const soldOut =
                    v.remainingSlots < 1 ||
                    Number(event.remainingParticipants || 0) < Number(v.participantsCount || 0);

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
    maxWidth: 1120,
    margin: "0 auto",
    padding: "24px 18px 56px",
    display: "grid",
    gap: 22,
    color: "#123047",
  },
  topActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    paddingBottom: 18,
    borderBottom: "1px solid #d8e8e8",
  },
  brandLink: {
    color: "#123047",
    fontWeight: 800,
    fontSize: 20,
    textDecoration: "none",
    letterSpacing: 0.2,
  },
  actionGroup: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  btn: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid #d8e8e8",
    background: "white",
    color: "#123047",
    cursor: "pointer",
    fontWeight: 700,
  },
  msg: {
    padding: 12,
    borderRadius: 12,
    background: "#eef8f8",
    border: "1px solid #d8e8e8",
  },
  subtle: {
    color: "#5b7583",
    fontSize: 14,
  },
  heroCard: {
    border: "1px solid #d8e8e8",
    borderRadius: 8,
    overflow: "hidden",
    background: "white",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
    boxShadow: "0 22px 55px rgba(18, 48, 71, 0.1)",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    minHeight: 430,
    objectFit: "cover",
  },
  heroContent: {
    padding: 30,
    display: "grid",
    gap: 14,
    alignContent: "center",
  },
  eyebrow: {
    color: "#2f7c8a",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: "clamp(34px, 5vw, 58px)",
    lineHeight: 1.03,
    fontWeight: 800,
    color: "#123047",
  },
  typeBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#e9f6f7",
    color: "#1f6f7b",
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
    alignSelf: "start",
  },
  subtleLine: {
    color: "#5b7583",
    fontSize: 14,
  },
  description: {
    color: "#39576a",
    fontSize: 15,
    lineHeight: 1.65,
  },
  noteBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    background: "#f7fbfb",
    border: "1px solid #d8e8e8",
    color: "#39576a",
  },
  section: {
    display: "grid",
    gap: 14,
  },
  sectionTitle: {
    fontWeight: 900,
    fontSize: 28,
    color: "#123047",
  },
  variationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  variationCard: {
    border: "1px solid #d8e8e8",
    borderRadius: 8,
    padding: 18,
    background: "white",
    display: "grid",
    gap: 12,
    boxShadow: "0 16px 38px rgba(18, 48, 71, 0.08)",
  },
  priceBadge: {
    padding: "5px 10px",
    borderRadius: 999,
    background: "#fff6e5",
    color: "#956b25",
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  primary: {
    padding: "12px 16px",
    borderRadius: 999,
    border: "1px solid #cfa35a",
    background: "#cfa35a",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },
  disabledBtn: {
    padding: "12px 16px",
    borderRadius: 999,
    border: "1px solid #d8e8e8",
    background: "#eef1f1",
    color: "#6f8590",
    cursor: "not-allowed",
    fontWeight: 800,
  },
};
