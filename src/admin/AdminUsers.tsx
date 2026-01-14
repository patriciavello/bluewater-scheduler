import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() || "http://localhost:3001";

const TOKEN_KEY = "ADMIN_JWT";

type ApiUser = {
  id: string; // uuid
  email: string;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  isAdmin: boolean;
  isGoldMember: boolean;
  createdAt?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export default function AdminUsers() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Search
  const [search, setSearch] = useState("");
  const [serverQuery, setServerQuery] = useState("");

  // Create form
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [createGold, setCreateGold] = useState(false);

  // StrictMode guard (prevents double-fetch on mount in dev)
  const didInit = useRef(false);

  const tokenMissing = !getToken();

  const filteredLocalCount = useMemo(() => users.length, [users]);

  async function loadUsers(q: string) {
    const token = getToken();
    if (!token) {
      setErr("Missing admin token. Please log in again.");
      setUsers([]);
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const url = new URL(`${API_BASE}/api/admin/users`);
      if (q.trim()) url.searchParams.set("q", q.trim());

      const res = await fetch(url.toString(), { headers: authHeaders() });
      const data = await safeJson(res);

      if (!res.ok || !(data as any)?.ok) {
        throw new Error((data as any)?.error || `Failed to load (${res.status})`);
      }

      setUsers(Array.isArray((data as any).users) ? (data as any).users : []);
      setServerQuery(q);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    loadUsers("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loadUsers(search);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !phone.trim() || !password) {
      setErr("Email, phone, and password are required.");
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          isGoldMember: createGold,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok || !(data as any)?.ok) {
        throw new Error((data as any)?.error || `Create failed (${res.status})`);
      }

      const newUser = (data as any).user as ApiUser;

      // Add to top; avoid duplicates by id
      setUsers((prev) => {
        if (prev.some((u) => u.id === newUser.id)) return prev;
        return [newUser, ...prev];
      });

      // Reset form
      setEmail("");
      setPhone("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setCreateGold(false);
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function setGold(u: ApiUser, nextGold: boolean) {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u.id}/gold`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isGoldMember: nextGold }),
      });

      const data = await safeJson(res);

      if (!res.ok || !(data as any)?.ok) {
        throw new Error((data as any)?.error || `Update failed (${res.status})`);
      }

      const updated = (data as any).user as ApiUser;
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e: any) {
      setErr(e?.message || "Failed to update gold status");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(u: ApiUser) {
    if (u.isAdmin) {
      setErr("Delete is disabled for admin users.");
      return;
    }
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;

    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data = await safeJson(res);

      if (!res.ok || !(data as any)?.ok) {
        throw new Error((data as any)?.error || `Delete failed (${res.status})`);
      }

      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Users</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            API: <code style={styles.code}>{API_BASE}</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={styles.btn} onClick={() => loadUsers(serverQuery)} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {tokenMissing ? (
        <div style={{ ...styles.warn, marginTop: 12 }}>
          <b>Admin token missing.</b> Please sign in again on <code>/admin</code>.
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Token key expected: <code>localStorage.ADMIN_JWT</code>
          </div>
        </div>
      ) : null}

      {err ? <div style={{ ...styles.error, marginTop: 12 }}>{err}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Create */}
        <section style={styles.card}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Create user</div>

          <form onSubmit={createUser} style={{ display: "grid", gap: 10 }}>
            <label style={styles.label}>
              <span>Email *</span>
              <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label style={styles.label}>
              <span>Phone *</span>
              <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>

            <label style={styles.label}>
              <span>Temporary password *</span>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={styles.label}>
                <span>First name</span>
                <input
                  style={styles.input}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label style={styles.label}>
                <span>Last name</span>
                <input
                  style={styles.input}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
            </div>

            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={createGold}
                onChange={(e) => setCreateGold(e.target.checked)}
              />
              <span>Create as Gold member</span>
            </label>

            <button style={styles.primary} type="submit" disabled={loading || tokenMissing}>
              Create
            </button>
          </form>
        </section>

        {/* Search */}
        <section style={styles.card}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Search</div>

          <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...styles.input, flex: 1 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="email / first / last name"
            />
            <button style={styles.btn} type="submit" disabled={loading || tokenMissing}>
              Search
            </button>
          </form>

          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
            Showing <b>{filteredLocalCount}</b> users
            {serverQuery ? (
              <>
                {" "}
                for <code style={styles.code}>{serverQuery}</code>
              </>
            ) : null}
          </div>
        </section>
      </div>

      {/* Table */}
      <section style={{ ...styles.card, marginTop: 12, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", fontWeight: 900 }}>
          User list
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Admin</th>
                <th style={styles.th}>Gold</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => {
                const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—";
                return (
                  <tr key={u.id}>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>{name}</td>
                    <td style={styles.td}>{u.phone}</td>
                    <td style={styles.td}>{u.isAdmin ? "Yes" : "No"}</td>
                    <td style={styles.td}>{u.isGoldMember ? "Gold" : "Standard"}</td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          style={styles.btn}
                          onClick={() => setGold(u, !u.isGoldMember)}
                          disabled={loading || tokenMissing}
                          title="Toggle Gold member"
                        >
                          {u.isGoldMember ? "Demote" : "Promote"}
                        </button>
                        <button
                          style={styles.btn}
                          onClick={() => deleteUser(u)}
                          disabled={loading || tokenMissing || u.isAdmin}
                          title={u.isAdmin ? "Admin delete disabled" : "Delete user"}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 12, opacity: 0.7 }}>
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
        Tip: If you see “Unauthorized”, log out and log in again so <code>ADMIN_JWT</code> refreshes.
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    background: "white",
  },
  label: { display: "grid", gap: 6, fontSize: 13 },
  input: { padding: 10, borderRadius: 10, border: "1px solid #d1d5db" },
  th: { padding: 10, borderBottom: "1px solid #e5e7eb", fontSize: 13, opacity: 0.85 },
  td: { padding: 10, borderBottom: "1px solid #f3f4f6", fontSize: 13 },
  btn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
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
  code: { padding: "2px 6px", borderRadius: 6, background: "#f3f4f6" },
  error: { padding: 12, borderRadius: 12, background: "#fee2e2", color: "#7f1d1d" },
  warn: { padding: 12, borderRadius: 12, background: "#fef3c7", color: "#7c2d12" },
};
