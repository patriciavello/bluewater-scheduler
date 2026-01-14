import { useMemo, useState } from "react";

export default function BoatForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: any | null;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  const start = useMemo(() => ({
    name: initial?.name || "",
    type: initial?.type || "",
    capacity: initial?.capacity ?? "",
  }), [initial]);

  const [form, setForm] = useState(start);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Name is required.");

    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        type: form.type.trim() || null,
        capacity: form.capacity === "" ? null : Number(form.capacity),
      });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      display: "grid", placeItems: "center", padding: 16
    }}>
      <form onSubmit={submit} style={{ background: "white", padding: 16, borderRadius: 14, width: 420 }}>
        <h2 style={{ marginTop: 0 }}>{initial ? "Edit Boat" : "New Boat"}</h2>

        <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          <span>Name</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>

        <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          <span>Type</span>
          <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="e.g. Pontoon" />
        </label>

        <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          <span>Capacity</span>
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            placeholder="e.g. 10"
          />
        </label>

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
