import { useEffect, useMemo, useState } from "react";
import { adminApi, Reservation } from "../api";

function toLocalInput(iso: string) {
  // ISO -> yyyy-mm-ddThh:mm for datetime-local
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInput(v: string) {
  // datetime-local string interpreted as local time
  const d = new Date(v);
  return d.toISOString();
}

export default function ReservationForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Reservation | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const now = useMemo(() => new Date(), []);
  const plus2h = useMemo(() => new Date(now.getTime() + 2 * 60 * 60 * 1000), [now]);

  const [boatId, setBoatId] = useState<string>(String(initial?.boat_id ?? ""));
  const [startLocal, setStartLocal] = useState<string>(
    initial?.start_time ? toLocalInput(initial.start_time) : toLocalInput(now.toISOString())
  );
  const [endLocal, setEndLocal] = useState<string>(
    initial?.end_time ? toLocalInput(initial.end_time) : toLocalInput(plus2h.toISOString())
  );

  const [customerName, setCustomerName] = useState(initial?.customer_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customer_email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // small UX: auto keep end after start
  useEffect(() => {
    if (!startLocal || !endLocal) return;
    const s = new Date(startLocal).getTime();
    const e = new Date(endLocal).getTime();
    if (e <= s) {
      const e2 = new Date(s + 60 * 60 * 1000);
      const yyyy = e2.getFullYear();
      const mm = String(e2.getMonth() + 1).padStart(2, "0");
      const dd = String(e2.getDate()).padStart(2, "0");
      const hh = String(e2.getHours()).padStart(2, "0");
      const mi = String(e2.getMinutes()).padStart(2, "0");
      setEndLocal(`${yyyy}-${mm}-${dd}T${hh}:${mi}`);
    }
  }, [startLocal]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!boatId.trim()) return setError("Boat ID is required (for now).");
    if (!startLocal || !endLocal) return setError("Start and end time are required.");

    const startIso = fromLocalInput(startLocal);
    const endIso = fromLocalInput(endLocal);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      return setError("End time must be after start time.");
    }

    setSaving(true);
    try {
      const payload = {
        boat_id: Number.isNaN(Number(boatId)) ? boatId : Number(boatId),
        start_time: startIso,
        end_time: endIso,
        customer_name: customerName.trim() || null,
        customer_email: customerEmail.trim() || null,
        notes: notes.trim() || null,
      };

      if (initial?.id != null) {
        await adminApi.updateReservation(initial.id, payload);
      } else {
        await adminApi.createReservation(payload);
      }

      await onSaved();
      onClose();
    } catch (e: any) {
      // If backend returns conflict error message, it will show here
      setError(e.message || "Failed to save reservation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlay}>
      <form onSubmit={submit} style={modal}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>{initial ? `Edit Reservation #${initial.id}` : "New Reservation"}</h2>
          <button type="button" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <label style={field}>
            <span>Boat ID</span>
            <input value={boatId} onChange={(e) => setBoatId(e.target.value)} placeholder="e.g. 1" />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={field}>
              <span>Start</span>
              <input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
            </label>
            <label style={field}>
              <span>End</span>
              <input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
            </label>
          </div>

          <label style={field}>
            <span>Customer name</span>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </label>

          <label style={field}>
            <span>Customer email</span>
            <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </label>

          <label style={field}>
            <span>Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>

          {error && <div style={{ color: "crimson" }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.35)",
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const modal: React.CSSProperties = {
  background: "white",
  width: 520,
  maxWidth: "100%",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,.18)",
};

const field: React.CSSProperties = { display: "grid", gap: 6 };
