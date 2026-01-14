import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, Ship, X } from "lucide-react";

// -------------------- API --------------------
const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.trim?.() ||
  "http://localhost:3001";

type Boat = {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  number_of_beds: number | null;
  location: string | null;
  image_url: string | null;
  description: string | null;
  active: boolean;
};

type ApiReservation = {
  id: string;
  boatId: string;
  startDate: string; // YYYY-MM-DD
  endExclusive: string; // YYYY-MM-DD
  status: string;
};

// -------------------- Helpers --------------------
const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const fromISODate = (s: string) => {
  const [y, m, d] = (s || "").split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
};

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDow = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" });
const formatMonDay = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

function nextSunday(ref: Date = new Date()) {
  const d = startOfDay(ref);
  const day = d.getDay(); // 0=Sun
  const delta = (7 - day) % 7;
  return addDays(d, delta === 0 ? 7 : delta);
}

// -------------------- Booking utilities --------------------
// Treat anything returned by schedule as "booked" for end users
function isBookedForDate(reservationsForBoat: ApiReservation[], dateIso: string) {
  return reservationsForBoat.some((r) => dateIso >= r.startDate && dateIso < r.endExclusive);
}

function windowFits(
  reservationsForBoat: ApiReservation[],
  startDay: Date,
  durationDays: number,
  scheduleStart: Date,
  scheduleEnd: Date
) {
  if (durationDays <= 1) {
    return !isBookedForDate(reservationsForBoat, toISODate(startDay));
  }
  for (let k = 0; k < durationDays; k++) {
    const dd = addDays(startDay, k);
    if (dd < scheduleStart || dd > scheduleEnd) return false;
    if (isBookedForDate(reservationsForBoat, toISODate(dd))) return false;
  }
  return true;
}

function maxDurationFrom(
  reservationsForBoat: ApiReservation[],
  startDay: Date,
  desiredDays: number,
  scheduleStart: Date,
  scheduleEnd: Date
) {
  const max = Math.max(1, Math.min(desiredDays, 30));

  let actual = 0;
  for (let k = 0; k < max; k++) {
    const d = addDays(startDay, k);
    if (d < scheduleStart || d > scheduleEnd) break;
    if (isBookedForDate(reservationsForBoat, toISODate(d))) break;
    actual++;
  }

  return Math.max(1, actual);
}

function hasAnyAvailableWindow(
  reservationsForBoat: ApiReservation[],
  scheduleStart: Date,
  durationDays: number
) {
  if (durationDays <= 1) return true;
  for (let offset = 0; offset < 14; offset++) {
    let ok = true;
    for (let k = 0; k < durationDays; k++) {
      if (offset + k >= 14) {
        ok = false;
        break;
      }
      const d = addDays(scheduleStart, offset + k);
      if (isBookedForDate(reservationsForBoat, toISODate(d))) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// -------------------- UI bits --------------------
function UiButton({
  children,
  onClick,
  variant = "ghost",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "primary";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-white/30";
  const styles =
    variant === "primary"
      ? "bg-white text-slate-900 hover:bg-white/90"
      : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15";
  return (
    <button type="button" onClick={onClick} className={cx(base, styles, className)}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl", className)}>{children}</div>;
}

function Modal({
  open,
  onClose,
  boat,
  apiBase,
  requestStartIso,
  durationDays,
}: {
  open: boolean;
  onClose: () => void;
  boat: Boat | null;
  apiBase: string;
  requestStartIso: string;
  durationDays: number;
}) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSubmitMsg("");
      setSubmitting(false);
      setNotes("");
    }
  }, [open]);

  async function submitRequest() {
    if (!boat?.id) return;

    try {
      setSubmitting(true);
      setSubmitMsg("");

      // ✅ Require login first (cookie-based)
      const meRes = await fetch(`${apiBase}/api/me`, {
        method: "GET",
        credentials: "include",
      });

      const meData = await meRes.json().catch(() => ({}));

      if (!meRes.ok || !meData?.ok || !meData?.user?.id) {
        setSubmitMsg("Please login to request a reservation.");
        onClose();
        window.location.href = "/account";
        return;
      }

      // Build requester fields from logged-in user (keeps backend compatibility)
      const u = meData.user;
      const requesterEmail: string = u.email || "";
      const requesterName: string =
        `${u.first_name || ""} ${u.last_name || ""}`.trim() || "";

      // ✅ Create reservation request (send cookie)
      const res = await fetch(`${apiBase}/api/reservations/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boatId: boat.id,
          startDate: requestStartIso,
          durationDays,
          notes,

          // keep backward compatibility if your backend still expects these:
          requesterName,
          requesterEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // ✅ If session missing/expired, force login
      if (res.status === 401) {
        setSubmitMsg("Please login to request a reservation.");
        onClose();
        window.location.href = "/account";
        return;
      }

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
      }

      setSubmitMsg("✅ Request submitted! Status: PENDING");
    } catch (e: any) {
      setSubmitMsg(`❌ ${String(e?.message || "Request failed")}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
          >
            <div className="relative h-56 w-full">
              <img
                src={
                  boat?.image_url ||
                  "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=80"
                }
                alt={boat?.name || "Boat"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                className="absolute right-3 top-3 rounded-full bg-white/90 p-2 hover:bg-white"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-4 left-5 right-5">
                <div className="text-sm text-white/80">
                  {(boat?.type || "Boat")}{boat?.location ? ` • ${boat.location}` : ""}
                </div>
                <div className="text-2xl font-semibold text-white">{boat?.name}</div>
              </div>
            </div>

            <div className="p-5 sm:p-6 text-slate-900">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Capacity</div>
                  <div className="text-lg font-semibold">{boat?.capacity ?? "—"} guests</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Beds</div>
                  <div className="text-lg font-semibold">{boat?.number_of_beds ?? "—"}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Requested</div>
                  <div className="text-sm font-semibold">
                    {requestStartIso} • {durationDays} day(s)
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium">Request reservation</div>

                {/* ✅ Removed name/email fields — user must be logged in */}

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                />

                {submitMsg ? (
                  <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">{submitMsg}</div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  This creates a <b>PENDING</b> request. If dates overlap, it will be rejected.
                </div>
                <UiButton variant="primary" onClick={submitRequest} className="justify-center">
                  {submitting ? "Submitting..." : "Request reservation"}
                </UiButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


// -------------------- Main --------------------
export default function SchedulerApp() {
  const [startDateStr, setStartDateStr] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [selectedBoatIds, setSelectedBoatIds] = useState<Set<string>>(() => new Set());
  const [cursorDate, setCursorDate] = useState<Date>(() => nextSunday(new Date()));
  const [modalBoatId, setModalBoatId] = useState<string | null>(null);

  const [boats, setBoats] = useState<Boat[]>([]);
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // When user changes start date input, set cursor
  useEffect(() => {
    const parsed = fromISODate(startDateStr);
    if (parsed) setCursorDate(startOfDay(parsed));
    if (!startDateStr) setCursorDate(nextSunday(new Date()));
  }, [startDateStr]);

  const durationDays = useMemo(() => {
    const n = parseInt(durationStr, 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 30) : 1;
  }, [durationStr]);

  const scheduleStart = useMemo(() => startOfDay(cursorDate), [cursorDate]);
  const requestStartIso = startDateStr || toISODate(scheduleStart);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(scheduleStart, i)), [scheduleStart]);
  const scheduleEnd = useMemo(() => days[days.length - 1] ?? scheduleStart, [days, scheduleStart]);

  // Group reservations by boat
  const reservationsByBoat = useMemo(() => {
    const m: Record<string, ApiReservation[]> = {};
    for (const r of reservations) {
      (m[r.boatId] ||= []).push(r);
    }
    return m;
  }, [reservations]);

  // Selected window (startDate + duration)
  const selectedStart = useMemo(() => {
    const parsed = fromISODate(startDateStr);
    return parsed ? startOfDay(parsed) : scheduleStart;
  }, [startDateStr, scheduleStart]);

  const selectedEndExclusive = useMemo(() => addDays(selectedStart, durationDays), [selectedStart, durationDays]);

  const isInSelectedWindow = (d: Date) => d >= selectedStart && d < selectedEndExclusive;

  const modalBoat = useMemo(() => boats.find((b) => b.id === modalBoatId) || null, [boats, modalBoatId]);

  const onClickOpenCell = (boatId: string, day: Date) => {
    const iso = toISODate(day);

    // 1) set Start date to clicked day
    setStartDateStr(iso);

    // 2) shrink duration if needed
    const r = reservationsByBoat[boatId] || [];
    const desired = durationDays;
    const adjusted = maxDurationFrom(r, day, desired, scheduleStart, scheduleEnd);
    setDurationStr(String(adjusted));

    // 3) open modal
    setModalBoatId(boatId);
  };

  const toggleBoat = (id: string) => {
    setSelectedBoatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearBoats = () => setSelectedBoatIds(new Set());
  const shift = (dir: number) => setCursorDate((d) => addDays(d, dir * 14));

  // Fetch boats once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErrorMsg("");
        const res = await fetch(`${API_BASE}/api/boats`);
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Failed to load boats");

        const boatsArray: Boat[] = Array.isArray(data) ? data : (data.boats || []);
        if (!alive) return;
        setBoats(boatsArray);
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(e?.message || "Failed to load boats");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Fetch schedule whenever scheduleStart changes
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const startIso = toISODate(scheduleStart);
        const res = await fetch(`${API_BASE}/api/schedule?start=${encodeURIComponent(startIso)}&days=14`);
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Failed to load schedule");

        const reservationsArray: ApiReservation[] = Array.isArray(data) ? data : (data.reservations || []);
        if (!alive) return;
        setReservations(reservationsArray);
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(e?.message || "Failed to load schedule");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [scheduleStart]);

  // Filter boats by selection + availability window
  const boatsFiltered = useMemo(() => {
    const selected = selectedBoatIds;
    const base = selected.size ? boats.filter((b) => selected.has(b.id)) : boats;
  
    // If user picked a start date, enforce availability starting THAT day
    const parsed = fromISODate(startDateStr);
    const startToCheck = parsed ? startOfDay(parsed) : null;
  
    return base.filter((b) => {
      const r = reservationsByBoat[b.id] || [];
  
      // ✅ If start date is set, boat must be open on that start date
      if (startToCheck) {
        const startIso = toISODate(startToCheck);
  
        // start date booked -> hide boat
        if (isBookedForDate(r, startIso)) return false;
  
        // duration must fit starting that start date
        return windowFits(r, startToCheck, durationDays, scheduleStart, scheduleEnd);
      }
  
      // If no start date chosen, keep your original behavior
      return hasAnyAvailableWindow(r, scheduleStart, durationDays);
    });
  }, [
    boats,
    selectedBoatIds,
    reservationsByBoat,
    scheduleStart,
    scheduleEnd,
    durationDays,
    startDateStr,
  ]);
  

  return (
    <div className="min-h-screen bg-sky-950 text-white">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2400&q=80"
            alt="Ocean"
            className="h-[10px] w-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-950/80 via-sky-950/55 to-sky-950" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 ring-1 ring-white/15">
                <Ship className="h-4 w-4" />
                Boat Charter Scheduler
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Plan your next escape <span className="text-white/80">in one view</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Filter your fleet, pick a start date and duration, then scan availability across the next 14 days. Click any boat
                name for details and to complete your reservation online.
              </p>
              <div className="mt-2 text-xs text-white/55">
                API: <span className="font-mono">{API_BASE}</span>
              </div>

              {errorMsg ? (
                <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-100 ring-1 ring-red-200/20">
                  {errorMsg}
                </div>
              ) : null}
            </div>
          </div>

          {/* Filters */}
          <Card className="mt-6 overflow-hidden bg-white/10 ring-1 ring-white/15 backdrop-blur-md">
            <div className="p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-3">
                  <div className="text-xs text-white/70">Start date</div>
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <div className="mt-1 text-[11px] text-white/55">
                    Empty = next Sunday ({toISODate(nextSunday(new Date()))})
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs text-white/70">Duration (days)</div>
                  <input
                    inputMode="numeric"
                    value={durationStr}
                    onChange={(e) => setDurationStr(e.target.value.replace(/[^0-9]/g, ""))}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="1"
                  />
                  <div className="mt-1 text-[11px] text-white/55">Empty = 1 day</div>
                </div>

                <div className="md:col-span-7">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/70">My boats</div>
                    <button type="button" onClick={clearBoats} className="text-[11px] text-white/60 hover:text-white">
                      Clear
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {boats.map((b) => {
                      const active = selectedBoatIds.has(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBoat(b.id)}
                          className={cx(
                            "rounded-full px-3 py-1 text-xs ring-1 transition",
                            active ? "bg-white text-slate-950 ring-white" : "bg-white/10 text-white ring-white/15 hover:bg-white/15"
                          )}
                        >
                          {b.name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[11px] text-white/55">
                    <Search className="h-3.5 w-3.5" />
                    Showing boats that have at least one available window ≥{" "}
                    <span className="font-semibold text-white/70">{durationDays}</span> day(s) in this 14-day view.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Schedule header banner */}
      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-white/10">
          <div className="relative">
            <img
              src="https://www.visitfortmyers.com/sites/default/files/styles/low_profile_image_hero_mobile_375x256_/public/2021-12/amy_in_florida-Instagram-2653-ig-18030604084285766.jpg.webp?itok=YqtFTvbp"
              alt="Boca Grande Beach"
              className="h-28 w-full object-cover opacity-90 sm:h-32"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-sky-950/85 via-sky-950/55 to-sky-950/85" />
            <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <div className="text-sm font-medium text-white">14-day schedule</div>
                <div className="text-xs text-white/70">
                  Starting <span className="font-semibold text-white/85">{formatMonDay(scheduleStart)}</span> • Duration filter:{" "}
                  {durationDays} day(s) {loading ? "• Loading..." : ""}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <UiButton onClick={() => shift(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Past
                </UiButton>
                <UiButton onClick={() => shift(1)}>
                  Future
                  <ChevronRight className="h-4 w-4" />
                </UiButton>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule grid */}
        <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-white/10">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[260px_repeat(14,1fr)] border-b border-white/10">
              <div className="p-3 text-xs text-white/60">Boat</div>

              {days.map((d) => {
                const inWin = isInSelectedWindow(d);
                const iso = toISODate(d);

                return (
                  <div
                    key={iso}
                    className={cx(
                      "p-3 text-center transition",
                      inWin ? "bg-white/10" : "opacity-45",
                      isSameDay(d, new Date()) ? "bg-white/15" : ""
                    )}
                  >
                    <div className={cx("text-[11px]", inWin ? "text-white/70" : "text-white/40")}>
                      {formatDow(d)}
                    </div>
                    <div className={cx("text-xs font-medium", inWin ? "text-white" : "text-white/50")}>
                      {formatMonDay(d)}
                    </div>
                  </div>
                );
              })}
            </div>

            {boatsFiltered.length === 0 ? (
              <div className="p-6 text-sm text-white/70">No boats match the current filters in this 14-day window.</div>
            ) : (
              boatsFiltered.map((b) => {
                const r = reservationsByBoat[b.id] || [];
                return (
                  <div
                    key={b.id}
                    className="grid grid-cols-[260px_repeat(14,1fr)] border-b border-white/10 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <button
                        type="button"
                        onClick={() => setModalBoatId(b.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-left text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/15"
                      >
                        <span className="truncate">{b.name}</span>
                        <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70 ring-1 ring-white/10">
                          {b.type || "Boat"}
                        </span>
                      </button>
                    </div>

                    {days.map((d) => {
                      const iso = toISODate(d);
                      const booked = isBookedForDate(r, iso);
                      const fit = !booked && windowFits(r, d, durationDays, scheduleStart, scheduleEnd);
                      const inWin = isInSelectedWindow(d);

                      const label = booked ? "Booked" : "Open";
                      const clickable = !booked;

                      return (
                        <div key={iso} className={cx("p-2", inWin ? "" : "opacity-45")}>
                          <div
                            onClick={() => {
                              if (!clickable) return;
                              onClickOpenCell(b.id, d);
                            }}
                            className={cx(
                              "h-9 rounded-lg transition select-none",
                              inWin
                                ? cx(
                                    "ring-1",
                                    clickable
                                      ? "bg-white/6 ring-white/15 hover:bg-white/10 cursor-pointer"
                                      : "bg-white/12 ring-white/15",
                                    !booked && durationDays > 1 && fit ? "ring-2 ring-white/25" : ""
                                  )
                                : cx(
                                    "ring-0",
                                    clickable ? "bg-white/3 cursor-pointer" : "bg-white/8"
                                  )
                            )}
                            title={
                              clickable
                                ? `Open — click to set start date (${iso}) and request`
                                : "Booked"
                            }
                            role={clickable ? "button" : undefined}
                          >
                            <div className="flex h-full items-center justify-center">
                              <span
                                className={cx(
                                  "text-[11px]",
                                  inWin ? (booked ? "text-white/70" : "text-white/80") : "text-white/45"
                                )}
                              >
                                {label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Modal
        open={!!modalBoatId}
        onClose={() => setModalBoatId(null)}
        boat={modalBoat}
        apiBase={API_BASE}
        requestStartIso={requestStartIso}
        durationDays={durationDays}
      />
    </div>
  );
}
