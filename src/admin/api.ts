const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function parseJson(res: Response) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
}

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || `HTTP ${res.status}`);
  }
  return data as T;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
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
  numberOfBeds?: number | null;
  imageUrl?: string | null;
};


export const adminApi = {
  listReservations: (start: string, days = 14) =>
    request<{ reservations: Reservation[] }>(
      `/api/admin/reservations?start=${start}&days=${days}`
    ),
  
  createReservation: (payload: Partial<Reservation>) =>
    request(`${API_BASE}/api/admin/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  updateReservation: (id: Reservation["id"], payload: Partial<Reservation>) =>
    request(`${API_BASE}/api/admin/reservations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  approveReservation: (id: string) =>
    request(`/api/admin/reservations/${id}/approve`, { method: "POST" }),
    
  denyReservation: (id: string) =>
    request(`/api/admin/reservations/${id}/deny`, { method: "POST" }),
    

  cancelReservation: (id: Reservation["id"]) =>
    request(`${API_BASE}/api/admin/reservations/${id}/cancel`, { method: "POST" }),


  // ✅ NEW: Boats
  
  listBoats: () =>
    request(`${API_BASE}/api/admin/boats`),

  createBoat: (payload: any) =>
    request(`${API_BASE}/api/admin/boats`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateBoat: (id: string, payload: any) =>
    request(`${API_BASE}/api/admin/boats/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteBoat: (id: string) =>
    request(`${API_BASE}/api/admin/boats/${id}`, {
      method: "DELETE",
    }),
  };