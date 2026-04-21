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
  if (type === "TRAINING") return "🎓 Training";
  if (type === "FLOTILLA") return "⛵ Flotilla";
  if (type === "SAILING_TOUR") return "🌊 Sailing Tour";
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
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Upcoming Events</h2>
        <div style={styles.subtle}>
          Join a flotilla, sailing tour or training event on fixed dates.
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
                <div style={{ fontWeight: 900, fontSize: 18 }}>{event.title}</div>
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
    maxWidth: 1100,
    margin: "0 auto",
    padding: 16,
    display: "grid",
    gap: 16,
  },
  header: {
    display: "grid",
    gap: 4,
  },
  subtle: {
    color: "#6b7280",
    fontSize: 14,
  },
  msg: {
    padding: 12,
    borderRadius: 12,
    background: "#f3f4f6",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "white",
    display: "grid",
    gap: 10,
  },
  image: {
    width: "100%",
    height: 180,
    objectFit: "cover",
    borderRadius: 12,
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
    fontSize: 13,
  },
  description: {
    fontSize: 14,
    color: "#111827",
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
};
