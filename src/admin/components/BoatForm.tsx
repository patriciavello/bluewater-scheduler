import React, { useEffect, useMemo, useState } from "react";

type BoatLike = {
  id?: string;
  name?: string;
  type?: string | null;
  location?: string | null;
  capacity?: number | null;

  // backend might use either:
  number_of_beds?: number | null;
  numberOfBeds?: number | null;

  image_url?: string | null;
  imageUrl?: string | null;
};

export default function BoatForm({
  initial,
  onClose,
  onSave,
}: {
  initial: BoatLike | null;
  onClose: () => void;
  onSave: (payload: any) => Promise<void> | void;
}) {
  const isEdit = !!initial?.id;

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [capacity, setCapacity] = useState<string>(
    initial?.capacity != null ? String(initial.capacity) : ""
  );

  const initialBeds =
    initial?.numberOfBeds ?? initial?.number_of_beds ?? null;

  const [beds, setBeds] = useState<string>(
    initialBeds != null ? String(initialBeds) : ""
  );

  const initialImg =
    initial?.imageUrl ?? initial?.image_url ?? "";

  const [imageUrl, setImageUrl] = useState(initialImg);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!initial) return;
    setName(initial.name ?? "");
    setType(initial.type ?? "");
    setLocation(initial.location ?? "");
    setCapacity(initial.capacity != null ? String(initial.capacity) : "");
    setBeds(
      (initial.numberOfBeds ?? initial.number_of_beds) != null
        ? String(initial.numberOfBeds ?? initial.number_of_beds)
        : ""
    );
    setImageUrl(initial.imageUrl ?? initial.image_url ?? "");
  }, [initial?.id]); // reset when switching boats

  const previewUrl = useMemo(() => {
    const u = (imageUrl || "").trim();
    if (!u) return "";
    // basic check — allow http(s) urls
    if (!/^https?:\/\//i.test(u)) return "";
    return u;
  }, [imageUrl]);

  function normalizeNumber(v: string): number | null {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setMsg("Boat name is required.");
      return;
    }

    // Build payload (camelCase)
    const payload: any = {
      name: trimmedName,
      type: type.trim() || null,
      location: location.trim() || null,
      capacity: normalizeNumber(capacity),
      numberOfBeds: normalizeNumber(beds),
      imageUrl: imageUrl.trim() || null,
    };

    // Remove nulls to keep PATCH clean (optional)
    Object.keys(payload).forEach((k) => {
      if (payload[k] === null || payload[k] === "") delete payload[k];
    });

    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setMsg(err?.message || "Failed to save boat");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "min(920px, 100%)",
          background: "white",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
        }}
      >
        {/* Left: fields */}
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {isEdit ? "Edit Boat" : "Create Boat"}
              </div>
              <div style={{ opacity: 0.7, fontSize: 13 }}>
                Update boat details, including image URL.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid #e5e7eb",
                background: "white",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="e.g., Bluewater 42"
                required
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Type</span>
                <input
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g., Catamaran"
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Location</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g., Miami"
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Capacity</span>
                <input
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g., 8"
                  inputMode="numeric"
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Beds</span>
                <input
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g., 4"
                  inputMode="numeric"
                />
              </label>
            </div>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Image URL</span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={inputStyle}
                placeholder="https://..."
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                Tip: use a direct image link (jpg/png/webp). If it doesn’t start with http(s), preview won’t show.
              </div>
            </label>

            {msg ? (
              <div style={{ marginTop: 6, padding: 10, borderRadius: 12, background: "#f8fafc", color: "#0f172a" }}>
                {msg}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  border: "none",
                  background: "#0f172a",
                  color: "white",
                  borderRadius: 12,
                  padding: "10px 14px",
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : isEdit ? "Save changes" : "Create boat"}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "white",
                  borderRadius: 12,
                  padding: "10px 14px",
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Right: image preview */}
        <div style={{ background: "#0b1220", padding: 12, display: "flex", flexDirection: "column" }}>
          <div style={{ color: "white", opacity: 0.85, fontSize: 13, marginBottom: 10 }}>
            Preview
          </div>

          <div
            style={{
              flex: 1,
              borderRadius: 14,
              overflow: "hidden",
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 240,
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Boat preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={() => setMsg("Image URL could not be loaded. Please check the link.")}
              />
            ) : (
              <div style={{ color: "white", opacity: 0.7, padding: 16, textAlign: "center" }}>
                Paste a valid image URL to see a preview.
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, color: "white", opacity: 0.65, fontSize: 12 }}>
            The scheduler will use this image for the boat card and modal.
          </div>
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 6 };
const labelTextStyle: React.CSSProperties = { fontSize: 12, opacity: 0.75 };
const inputStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
};
