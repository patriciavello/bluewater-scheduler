import { useEffect, useState } from "react";
import { adminApi } from "../api";
import BoatForm from "../components/BoatForm";

export default function BoatsPage() {
  const [boats, setBoats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.listBoats();
      setBoats(data.boats || []);
    } catch (e: any) {
      setError(e.message || "Failed to load boats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onDelete(id: any) {
    if (!confirm("Delete this boat?")) return;
    try {
      await adminApi.deleteBoat(id);
      await refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Boats</h1>
        <button onClick={() => setCreating(true)}>+ New Boat</button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Type</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Capacity</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {boats.map(b => (
              <tr key={b.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{b.name}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{b.type || "-"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{b.capacity ?? "-"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                  <button onClick={() => setEditing(b)}>Edit</button>{" "}
                  <button onClick={() => onDelete(b.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(creating || editing) && (
        <BoatForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (payload) => {
            if (editing) await adminApi.updateBoat(editing.id, payload);
            else await adminApi.createBoat(payload);
            setCreating(false); setEditing(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
