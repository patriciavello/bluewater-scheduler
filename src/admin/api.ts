const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TOKEN_KEY = "ADMIN_JWT";


async function parseJson(res: Response) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
}



async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY) || "";

  // Merge headers safely
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Ensure JSON headers when body is present
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // ✅ TEMP debug: remove later
  

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  const data = await parseJson(res);

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}



export type ReservationStatus = "PENDING" | "APPROVED" | "DENIED" | "CANCELLED" | "BLOCKED";

export type Reservation = {
  id: string;
  boatId: string;
  boatName?: string;
  startDate: string;       // "YYYY-MM-DD" or ISO
  endExclusive: string;    // "YYYY-MM-DD" or ISO
  status: ReservationStatus;
  requesterName?: string | null;
  requesterEmail?: string | null;
  notes?: string | null;   // ✅ add this
};
export type Boat = {
  id: string;
  name: string;
  type?: string | null;
  location?: string | null;
  capacity?: number | null;
  number_of_beds?: number | null;
  image_url?: string | null;
  description?: string | null;
  active?: boolean;
};


export const adminApi = {
  listReservations: (start: string, days = 14) =>
    request<{ reservations: Reservation[] }>(
      `${API_BASE}/api/admin/reservations?start=${encodeURIComponent(start)}&days=${encodeURIComponent(String(days))}`
    ),

  createReservation: (payload: Partial<Reservation>) =>
    request(`${API_BASE}/api/admin/reservations`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Use PATCH unless your backend explicitly expects PUT
  updateReservation: (id: Reservation["id"], payload: Partial<Reservation>) =>
    request(`${API_BASE}/api/admin/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  approveReservation: (id: string) =>
    request(`${API_BASE}/api/admin/reservations/${id}/approve`, { method: "POST" }),

  denyReservation: (id: string) =>
    request(`${API_BASE}/api/admin/reservations/${id}/deny`, { method: "POST" }),

  cancelReservation: (id: Reservation["id"]) =>
    request(`${API_BASE}/api/admin/reservations/${id}/cancel`, { method: "POST" }),

  // Boats
  listBoats: () =>
    request<{ ok: true; boats: Boat[] }>(`${API_BASE}/api/admin/boats`),

  createBoat: (payload: Partial<Boat>) =>
    request<{ ok: true; boat: Boat }>(`${API_BASE}/api/admin/boats`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateBoat: (id: string, payload: Partial<Boat>) =>
    request<{ ok: true; boat: Boat }>(`${API_BASE}/api/admin/boats/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteBoat: (id: string) =>
    request<{ ok: true }>(`${API_BASE}/api/admin/boats/${id}`, {
      method: "DELETE",
    }),
};

