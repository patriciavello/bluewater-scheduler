import React, { useState } from "react";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/password/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Always show same message (security)
      await res.json().catch(() => ({}));
      setMsg("If that email exists, a reset link has been sent. ✅");
    } catch (err: any) {
      setMsg(err?.message || "Failed to request reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h2 style={{ margin: 0 }}>Forgot password</h2>
      <div style={{ opacity: 0.7, marginTop: 4 }}>
        Enter your email and we’ll send you a reset link.
      </div>

      <form onSubmit={submit} style={{ marginTop: 14, display: "grid", gap: 10, maxWidth: 420 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>

        {msg ? <div style={{ padding: 10, borderRadius: 10, background: "#f3f4f6" }}>{msg}</div> : null}

        <button
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #0ea5e9",
            background: "#0ea5e9",
            color: "white",
            fontWeight: 700,
          }}
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </div>
  );
}
