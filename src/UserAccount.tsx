import React, { useEffect, useRef, useState } from "react";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

<ReservationCard

type Me = {
  id: string;
  email: string;
  phone: string;
  first_name?: string | null;
  last_name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  is_goldmember: boolean;
};

type MyReservation = {
  id: string;
  boat_id: string;
  boat_name: string;
  start_date: string; // YYYY-MM-DD
  end_exclusive: string; // YYYY-MM-DD
  status: string;
  notes?: string | null;

  user_id?: string;
  captain_id?: string | null;

  client_email?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
};


async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}


async function apiFetch(path: string, init: RequestInit = {}) {
  // IMPORTANT: credentials include so browser sends/receives HttpOnly cookie `session`
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const data = await safeJson(res);
  return { res, data };
}

export default function UserAccount() {
  const [tab, setTab] = useState<"profile" | "password" | "reservations">("profile");

  // login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // toggle: login vs create account
  const [mode, setMode] = useState<"login" | "register">("login");

  // register form
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  
  
  const [me, setMe] = useState<Me | null>(null);
  const [resvs, setResvs] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // strictmode guard
  const didInit = useRef(false);

  async function loadMe() {
    setLoading(true);
    setMsg("");
    try {
      const { res, data } = await apiFetch("/api/me", { method: "GET" });
      if (!res.ok || !data.ok) {
        // Not signed in is normal here — just show login
        setMe(null);
        return;
      }
      setMe(data.user);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load profile");
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const { res, data } = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok || !data.ok) throw new Error(data.error || "Login failed");

      // Backend sets HttpOnly cookie (session). No token needed.
      setLoginPassword("");
      await loadMe();
    } catch (e: any) {
      setMsg(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const { res, data } = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: regEmail,
          phone: regPhone,
          password: regPassword,
        }),
      });

      if (!res.ok || !data.ok) throw new Error(data.error || "Registration failed");

      // Backend sets HttpOnly cookie (session). No token needed.
      setRegPassword("");
      await loadMe(); // ✅ auto-login into account view
    } catch (e: any) {
      setMsg(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }


  async function logout() {
    setLoading(true);
    setMsg("");
    try {
      // If you don’t have this route yet, I’ll give it to you.
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if logout route doesn't exist, clear UI state
    } finally {
      setMe(null);
      setResvs([]);
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!me) return;
    setLoading(true);
    setMsg("");
    try {
      const { res, data } = await apiFetch("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          phone: me.phone,
          first_name: me.first_name,
          last_name: me.last_name,
          address1: me.address1,
          address2: me.address2,
          city: me.city,
          state: me.state,
          zip: me.zip,
          country: me.country,
        }),
      });

      if (!res.ok || !data.ok) throw new Error(data.error || "Save failed");
      setMe(data.user);
      setMsg("Profile saved ✅");
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    setLoading(true);
    setMsg("");
    try {
      const { res, data } = await apiFetch("/api/me/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok || !data.ok) throw new Error(data.error || "Password change failed");

      setCurrentPassword("");
      setNewPassword("");
      setMsg("Password updated ✅");
    } catch (e: any) {
      setMsg(e?.message || "Password change failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadMyReservations() {
    setLoading(true);
    setMsg("");
    try {
      const { res, data } = await apiFetch("/api/me/reservations", { method: "GET" });
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load reservations");
      const toYMD = (v: any) => {
        if (!v) return "";
        const s = String(v);
        return s.length >= 10 ? s.slice(0, 10) : s; // handles "2026-01-13" and "2026-01-13T00:00:00.000Z"
      };
      
      const normalized = (data.reservations || []).map((r: any) => ({
        ...r,
        boat_name: r.boat_name ?? r.boatName ?? "",
        start_date: toYMD(r.start_date ?? r.startDate),
        end_exclusive: toYMD(r.end_exclusive ?? r.endExclusive),
      }));
      setResvs(normalized);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }

  async function cancelReservation(id: string) {
    if (!confirm("Cancel this reservation?")) return;
    setLoading(true);
    setMsg("");
    try {
      const { res, data } = await apiFetch(`/api/me/reservations/${id}`, { method: "DELETE" });
      if (!res.ok || !data.ok) throw new Error(data.error || "Cancel failed");
      setResvs((prev) => prev.map((r) => (r.id === id ? { ...r, status: "CANCELLED" } : r)));
      setMsg("Cancelled ✅");
    } catch (e: any) {
      setMsg(e?.message || "Cancel failed");
    } finally {
      setLoading(false);
    }
  }

  async function editReservation(id: string, start_date: string, end_exclusive: string) {
    setLoading(true);
    setMsg("");
    try {
      const { res, data } = await apiFetch(`/api/me/reservations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ start_date, end_exclusive }),
      });
  
      if (!res.ok || !data.ok) throw new Error(data.error || "Update failed");
  
      setMsg("Updated ✅");
  
      // ✅ Refetch the list so UI always matches backend
      await loadMyReservations();
    } catch (e: any) {
      setMsg(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    loadMe();
  }, []);

  // Not logged in view
  if (!me) {
    return (
      <div style={styles.page}>
        <h2 style={{ margin: 0 }}>My Account</h2>
        <div style={{ opacity: 0.7, marginTop: 4 }}>
          {mode === "login"
            ? "Sign in to manage your profile and reservations."
            : "Create your account to request and manage reservations."}
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            style={styles.btn}
            onClick={() => {
              setMode("login");
              setMsg("");
            }}
            disabled={mode === "login"}
          >
            Sign in
          </button>

          <button
            type="button"
            style={styles.btn}
            onClick={() => {
              setMode("register");
              setMsg("");
            }}
            disabled={mode === "register"}
          >
            Create account
          </button>
        </div>

        {/* Login form */}
        {mode === "login" ? (
          <form
            onSubmit={login}
            style={{ ...styles.card, display: "grid", gap: 10, maxWidth: 420, marginTop: 14 }}
          >
            <label style={styles.label}>
              <span>Email</span>
              <input
                style={styles.input}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                type="email"
                required
              />
            </label>

            <label style={styles.label}>
              <span>Password</span>
              <input
                style={styles.input}
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </label>

            {msg ? <div style={styles.msg}>{msg}</div> : null}

            <button style={styles.primary} disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>

            {/* optional: link to forgot password page you’ll add */}
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
              <a href="/forgot-password">Forgot password?</a>
            </div>
          </form>
        ) : (
          /* Register form */
          <form
            onSubmit={register}
            style={{ ...styles.card, display: "grid", gap: 10, maxWidth: 420, marginTop: 14 }}
          >
            <label style={styles.label}>
              <span>Email</span>
              <input
                style={styles.input}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                type="email"
                required
              />
            </label>

            <label style={styles.label}>
              <span>Phone</span>
              <input
                style={styles.input}
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="(555) 555-5555"
                required
              />
            </label>

            <label style={styles.label}>
              <span>Password (min 8 chars)</span>
              <input
                style={styles.input}
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>

            {msg ? <div style={styles.msg}>{msg}</div> : null}

            <button style={styles.primary} disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        )}
      </div>
    );
  }


  return (
    <div style={styles.page}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>My Account</h2>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            Signed in as <b>{me.email}</b> · Status:{" "}
            <b>{me.is_goldmember ? "Gold Member" : "Standard"}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={styles.btn} onClick={logout} disabled={loading}>
            Log out
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={styles.btn} onClick={() => setTab("profile")} disabled={tab === "profile"}>
          Profile
        </button>

        <button style={styles.btn} onClick={() => setTab("password")} disabled={tab === "password"}>
          Password
        </button>

        <button
          style={styles.btn}
          onClick={async () => {
            setTab("reservations");
            await loadMyReservations();
          }}
          disabled={tab === "reservations"}
        >
          My reservations
        </button>

        {/* New reservation → go to schedule */}
        <a href="/" style={{ textDecoration: "none" }}>
          <button style={styles.primary}>
            + New reservation
          </button>
        </a>
      </div>


      {msg ? <div style={{ ...styles.msg, marginTop: 12 }}>{msg}</div> : null}

      {tab === "profile" && (
        <div style={{ ...styles.card, marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Contact information</h3>

          <div style={styles.grid2}>
            <Field label="First name" value={me.first_name || ""} onChange={(v) => setMe({ ...me, first_name: v })} />
            <Field label="Last name" value={me.last_name || ""} onChange={(v) => setMe({ ...me, last_name: v })} />
          </div>

          <div style={styles.grid2}>
            <Field label="Phone" value={me.phone || ""} onChange={(v) => setMe({ ...me, phone: v })} />
            <div />
          </div>

          <div style={styles.grid2}>
            <Field label="Address 1" value={me.address1 || ""} onChange={(v) => setMe({ ...me, address1: v })} />
            <Field label="Address 2" value={me.address2 || ""} onChange={(v) => setMe({ ...me, address2: v })} />
          </div>

          <div style={styles.grid2}>
            <Field label="City" value={me.city || ""} onChange={(v) => setMe({ ...me, city: v })} />
            <Field label="State" value={me.state || ""} onChange={(v) => setMe({ ...me, state: v })} />
          </div>

          <div style={styles.grid2}>
            <Field label="ZIP" value={me.zip || ""} onChange={(v) => setMe({ ...me, zip: v })} />
            <Field label="Country" value={me.country || ""} onChange={(v) => setMe({ ...me, country: v })} />
          </div>

          <div style={{ marginTop: 12 }}>
            <button style={styles.primary} onClick={saveProfile} disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {tab === "password" && (
        <div style={{ ...styles.card, marginTop: 12, maxWidth: 520 }}>
          <h3 style={{ marginTop: 0 }}>Change password</h3>
          <label style={styles.label}>
            <span>Current password</span>
            <input
              style={styles.input}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label style={styles.label}>
            <span>New password</span>
            <input
              style={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <button style={{ ...styles.primary, marginTop: 12 }} onClick={changePassword} disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </div>
      )}

      {tab === "reservations" && (
        <div style={{ ...styles.card, marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>My reservations</h3>

          {loading ? (
            <div style={{ opacity: 0.7 }}>Loading…</div>
          ) : resvs.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No reservations yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {resvs.map((r) => (
                <ReservationCard
                  key={r.id}
                  r={r}
                  viewerId={me.id}
                  onCancel={() => cancelReservation(r.id)}
                  onEdit={(s, e) => editReservation(r.id, s, e)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={styles.label}>
      <span>{label}</span>
      <input style={styles.input} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ReservationCard({
  r,
  viewerId,
  onCancel,
  onEdit,
}: {
  r: MyReservation;
  viewerId: string;
  onCancel: () => void;
  onEdit: (start_date: string, end_exclusive: string) => void;
}) {
  const status = String(r.status).toUpperCase();

  const isCaptainView =
    !!r.captain_id &&
    r.captain_id === viewerId &&
    !!r.user_id &&
    r.user_id !== viewerId;

  // Captains should not edit/cancel client reservations here
  const canEdit = status === "PENDING" && !isCaptainView;

  const clientDisplay =
    (`${r.client_first_name || ""} ${r.client_last_name || ""}`.trim()) ||
    r.client_email ||
    "";

  // initial dates
  const [startDate, setStartDate] = useState(r.start_date);

  // compute initial duration from stored exclusive date
  const initialDuration = (() => {
    if (!r.start_date || !r.end_exclusive) return 1;
    const s = new Date(r.start_date + "T00:00:00");
    const e = new Date(r.end_exclusive + "T00:00:00");
    const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
    return diff > 0 ? diff : 1;
  })();

  const [durationDays, setDurationDays] = useState(initialDuration);

  useEffect(() => {
    setStartDate(r.start_date);

    if (r.start_date && r.end_exclusive) {
      const s = new Date(r.start_date + "T00:00:00");
      const e = new Date(r.end_exclusive + "T00:00:00");
      const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
      setDurationDays(diff > 0 ? diff : 1);
    }
  }, [r.start_date, r.end_exclusive]);

  // compute inclusive end date for display
  let endInclusive = "";
  if (startDate && durationDays) {
    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + Number(durationDays) - 1);
    endInclusive = d.toISOString().slice(0, 10);
  }

  // When user clicks save, convert duration → exclusive end date
  function handleSave() {
    if (!startDate || !durationDays) return;

    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + Number(durationDays));
    const endExclusive = d.toISOString().slice(0, 10);

    onEdit(startDate, endExclusive);
  }

  return (
    <div style={styles.resCard}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>{r.boat_name}</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Status: <b>{status}</b>
          </div>

          {/* ✅ Only show client info to captains */}
          {isCaptainView && clientDisplay ? (
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
              Client: <b>{clientDisplay}</b>
              {r.client_email ? <span style={{ opacity: 0.7 }}> · {r.client_email}</span> : null}
            </div>
          ) : null}
        </div>

        <div style={{ opacity: 0.5, fontSize: 12, fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace" }}>
          {r.id}
        </div>
      </div>

      <div style={{ opacity: 0.75, fontSize: 13, marginTop: 6 }}>
        Current reservation: <b>{r.start_date}</b> → <b>{endInclusive}</b>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={styles.label}>
          <span>Start date</span>
          <input
            style={styles.input}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={!canEdit}
          />
        </label>

        <label style={styles.label}>
          <span>Duration (days)</span>
          <input
            style={styles.input}
            type="number"
            min={1}
            max={60}
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            disabled={!canEdit}
          />
        </label>
      </div>

      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
        {isCaptainView
          ? "To reschedule or cancel, please contact the office. Fees may apply."
          : "After approved, if need to cancel or reschedule, call the office, fee may apply."}
        {" "}
        Until: <b>{startDate || "—"}</b>
      </div>

      {status === "PENDING" && !isCaptainView ? (
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={handleSave}>
            Change my reservation
          </button>
          <button style={styles.btn} onClick={onCancel}>
            Cancel reservation
          </button>
        </div>
      ) : null}

      {r.notes ? <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>Notes: {r.notes}</div> : null}
    </div>
  );
}



const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" },
  card: { border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "white" },
  label: { display: "grid", gap: 6, fontSize: 13 },
  input: { padding: 10, borderRadius: 10, border: "1px solid #d1d5db" },
  btn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #d1d5db", background: "white", cursor: "pointer" },
  primary: { padding: "10px 12px", borderRadius: 12, border: "1px solid #111827", background: "#111827", color: "white", cursor: "pointer", fontWeight: 700 },
  msg: { padding: 12, borderRadius: 12, background: "#f3f4f6" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 },
  resCard: { border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "white" },
};
