import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

export default function EventsListPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/events`);
      const data = await safeJson(res);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load events");
      }

      setEvents(data.events || []);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.nav}>
        <Link to="/" style={styles.brandLink}>Bluewater Escapes</Link>
        <div style={styles.navActions}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <button style={styles.navButton}>Calendar</button>
          </Link>
          <Link to="/account" style={{ textDecoration: "none" }}>
            <button style={styles.navButton}>My Account</button>
          </Link>
        </div>
      </div>

      <div style={styles.header}>
        <div style={styles.eyebrow}>Experiences</div>
        <h1 style={styles.title}>Find Your Escape</h1>
        <div style={styles.subtle}>
          Join a flotilla, sailing tour or training event on fixed dates, with the same calm booking flow as your charter schedule.
        </div>
      </div>

      {msg ? <div style={styles.msg}>{msg}</div> : null}

      {loading ? (
        <div style={styles.subtle}>Loading…</div>
      ) : events.length === 0 ? (
        <div style={styles.subtle}>No published events found.</div>
      ) : (
        <div style={styles.grid}>
          {events.map((event) => (
            <div key={event.id} style={styles.card}>
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  style={styles.image}
                />
              ) : null}

              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: "#123047" }}>{event.title}</div>
                <div style={styles.typeBadge}>{eventTypeLabel(event.eventType)}</div>
              </div>

              <div style={styles.subtleLine}>{event.boatName}</div>
              <div style={styles.subtleLine}>
                {toDisplayRange(event.startDate, event.endExclusive)}
              </div>
              <div style={styles.subtleLine}>
                Remaining spots: <b>{event.remainingParticipants}</b>
              </div>

              {event.description ? (
                <div style={styles.description}>{event.description}</div>
              ) : null}

              <Link to={`/events/${event.id}`} style={{ textDecoration: "none" }}>
                <button style={styles.primary}>View Event</button>
              </Link>
            </div>
          ))}
        </div>
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
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 18,
    borderBottom: "1px solid #d8e8e8",
  },
  navActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  brandLink: {
    color: "#123047",
    fontWeight: 800,
    fontSize: 20,
    textDecoration: "none",
    letterSpacing: 0.2,
  },
  navButton: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid #d8e8e8",
    background: "white",
    color: "#123047",
    cursor: "pointer",
    fontWeight: 700,
  },
  header: {
    display: "grid",
    gap: 8,
    padding: "42px 0 18px",
  },
  eyebrow: {
    color: "#2f7c8a",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: "clamp(36px, 6vw, 66px)",
    lineHeight: 1.02,
    fontWeight: 800,
    color: "#123047",
  },
  subtle: {
    color: "#5b7583",
    fontSize: 16,
    lineHeight: 1.65,
    maxWidth: 720,
  },
  msg: {
    padding: 12,
    borderRadius: 12,
    background: "#eef8f8",
    border: "1px solid #d8e8e8",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 18,
  },
  card: {
    border: "1px solid #d8e8e8",
    borderRadius: 8,
    padding: 14,
    background: "white",
    display: "grid",
    gap: 12,
    boxShadow: "0 18px 45px rgba(18, 48, 71, 0.08)",
  },
  image: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 6,
  },
  typeBadge: {
    padding: "5px 10px",
    borderRadius: 999,
    background: "#e9f6f7",
    color: "#1f6f7b",
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  subtleLine: {
    color: "#5b7583",
    fontSize: 13,
  },
  description: {
    fontSize: 14,
    color: "#39576a",
    lineHeight: 1.55,
  },
  primary: {
    padding: "12px 16px",
    borderRadius: 999,
    border: "1px solid #cfa35a",
    background: "#cfa35a",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
    width: "100%",
  },
};
