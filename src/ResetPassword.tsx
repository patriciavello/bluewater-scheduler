import React, { useMemo, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPassword() {
  const q = useQuery();
  const token = q.get("token") || "";
  const email = q.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || !email) {
    return <Navigate to="/forgot-password" replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/password/reset`, {
        method: "POST",
        credentials: "include", // so auto-login cookie is saved
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data?.error || "Reset failed");

      setMsg("Password updated ✅ Redirecting to your account…");
      setDone(true);

      // send to account page
      setTimeout(() => {
        window.location.href = "/account";
      }, 900);
    } catch (err: any) {
      setMsg(err?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h2 style={{ margin: 0 }}>Set new password</h2>
      <div style={{ opacity: 0.7, marginTop: 4 }}>
        For <b>{email}</b>
      </div>

      <form onSubmit={submit} style={{ marginTop: 14, display: "grid", gap: 10, maxWidth: 420 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>New password</span>
          <input
            style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            minLength={8}
            required
            disabled={done}
          />
        </label>

        {msg ? <div style={{ padding: 10, borderRadius: 10, background: "#f3f4f6" }}>{msg}</div> : null}

        <button
          disabled={loading || done}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #0ea5e9",
            background: "#0ea5e9",
            color: "white",
            fontWeight: 700,
          }}
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
