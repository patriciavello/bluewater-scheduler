import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Search, Ship, X } from "lucide-react";

// --- Helpers (no external date lib needed) ---
const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const formatDow = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" });
const formatMonDay = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

function nextSunday(ref: Date = new Date()) {
  const d = startOfDay(ref);
  const day = d.getDay(); // 0=Sun
  const delta = (7 - day) % 7;
  return addDays(d, delta === 0 ? 7 : delta);
}

type Boat = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  lengthFt: number;
  location: string;
  image: string;
  description: string;
};

const BOATS: Boat[] = [
  {
    id: "excess11",
    name: "Excess 11 Catamaran",
    type: "Catamaran",
    capacity: 8,
    lengthFt: 37,
    location: "St. Pete, FL",
    image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=80",
    description:
      "A modern cruising catamaran built for comfort and speed. Spacious cockpit, bright saloon, and plenty of room for families or friends.",
  },
  {
    id: "oceanis401",
    name: "Oceanis 40.1 Sailboat",
    type: "Monohull",
    capacity: 6,
    lengthFt: 40,
    location: "St. Pete, FL",
    image: "https://images.unsplash.com/photo-1500622944204-b135684e99fd?auto=format&fit=crop&w=1400&q=80",
    description:
      "A sleek monohull with excellent handling and a refined interior. Ideal for couples or smaller crews looking for a classic sailing feel.",
  },
  {
    id: "lagoon46",
    name: "Lagoon 46",
    type: "Catamaran",
    capacity: 10,
    lengthFt: 46,
    location: "Key West, FL",
    image: "https://images.unsplash.com/photo-1528150177508-7cc0c36cda5a?auto=format&fit=crop&w=1400&q=80",
    description: "A premium, roomy catamaran with flybridge lounging and a big aft deck. Great for multi-day island hopping.",
  },
  {
    id: "dufour390",
    name: "Dufour 390 Grand Large",
    type: "Monohull",
    capacity: 6,
    lengthFt: 39,
    location: "Sarasota, FL",
    image: "https://images.unsplash.com/photo-1518398046578-8cca57782e17?auto=format&fit=crop&w=1400&q=80",
    description:
      "Balanced performance cruiser with a bright interior and comfortable deck layout. A versatile choice for day sails or weekend trips.",
  },
];

// Bookings: start inclusive, end exclusive (if end missing, single day)
type BookingRange = { start: string; end?: string };
const BOOKINGS: Record<string, BookingRange[]> = {
  excess11: [
    { start: "2026-01-11", end: "2026-01-13" },
    { start: "2026-01-16", end: "2026-01-17" },
  ],
  oceanis401: [{ start: "2026-01-14", end: "2026-01-15" }],
  lagoon46: [{ start: "2026-01-18", end: "2026-01-22" }],
  dufour390: [{ start: "2026-01-12", end: "2026-01-13" },
  ],
};

function isBooked(boatId: string, date: Date) {
  const iso = toISODate(date);
  const ranges = BOOKINGS[boatId] || [];
  return ranges.some((r) => {
    const s = r.start;
    const e = r.end;
    if (!e) return iso === s;
    return iso >= s && iso < e;
  });
}

function hasAvailabilityWindow(boatId: string, startDate: Date, durationDays: number) {
  if (durationDays <= 1) return true;
  for (let offset = 0; offset < 14; offset++) {
    let ok = true;
    for (let k = 0; k < durationDays; k++) {
      if (offset + k >= 14) { ok = false; break; }
      const d = addDays(startDate, offset + k);
      if (isBooked(boatId, d)) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

function computeWindowFits(
  boatId: string,
  startDay: Date,
  durationDays: number,
  scheduleStart: Date,
  scheduleEnd: Date
) {
  if (durationDays <= 1) return !isBooked(boatId, startDay);
  for (let k = 0; k < durationDays; k++) {
    const dd = addDays(startDay, k);
    if (dd < scheduleStart || dd > scheduleEnd) return false;
    if (isBooked(boatId, dd)) return false;
  }
  return true;
}

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// Simple button component (no shadcn)
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

// Simple card
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl", className)}>{children}</div>;
}

function Modal({ open, onClose, boat }: { open: boolean; onClose: () => void; boat: Boat | null }) {
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
              <img src={boat?.image} alt={boat?.name} className="h-full w-full object-cover" />
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
                  {boat?.type} {boat?.location ? `• ${boat.location}` : ""}
                </div>
                <div className="text-2xl font-semibold text-white">{boat?.name}</div>
              </div>
            </div>

            <div className="p-5 sm:p-6 text-slate-900">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Capacity</div>
                  <div className="text-lg font-semibold">{boat?.capacity} guests</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Length</div>
                  <div className="text-lg font-semibold">{boat?.lengthFt} ft</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Location</div>
                  <div className="text-lg font-semibold">{boat?.location}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium">About this boat</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{boat?.description}</p>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">Hook this up to your real fleet API later.</div>
                <UiButton variant="primary">Request availability</UiButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function App() {
  const [startDateStr, setStartDateStr] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [selectedBoatIds, setSelectedBoatIds] = useState<Set<string>>(() => new Set());
  const [cursorDate, setCursorDate] = useState<Date>(() => nextSunday(new Date()));
  const [modalBoatId, setModalBoatId] = useState<string | null>(null);

  useEffect(() => {
    const parsed = fromISODate(startDateStr);
    if (parsed) setCursorDate(startOfDay(parsed));
    if (!startDateStr) setCursorDate(nextSunday(new Date()));
  }, [startDateStr]);

  const durationDays = useMemo(() => {
    const n = parseInt(durationStr, 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 30) : 1;
  }, [durationStr]);

  const effectiveStart = useMemo(() => {
    const parsed = fromISODate(startDateStr);
    return parsed ? startOfDay(parsed) : nextSunday(new Date());
  }, [startDateStr]);

  const scheduleStart = useMemo(() => startOfDay(cursorDate), [cursorDate]);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(scheduleStart, i)), [scheduleStart]);
  const scheduleEnd = useMemo(() => days[days.length - 1] ?? scheduleStart, [days, scheduleStart]);

  const boatsFiltered = useMemo(() => {
    const selected = selectedBoatIds;
    const base = selected.size ? BOATS.filter((b) => selected.has(b.id)) : BOATS;
    return base.filter((b) => hasAvailabilityWindow(b.id, scheduleStart, durationDays));
  }, [selectedBoatIds, scheduleStart, durationDays]);

  const modalBoat = useMemo(() => BOATS.find((b) => b.id === modalBoatId) || null, [modalBoatId]);

  const toggleBoat = (id: string) => {
    setSelectedBoatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearBoats = () => setSelectedBoatIds(new Set());
  const jumpToEffectiveStart = () => setCursorDate(startOfDay(effectiveStart));
  const shift = (dir: number) => setCursorDate((d) => addDays(d, dir * 14));

  return (
    <div className="min-h-screen bg-sky-950 text-white">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2400&q=80"
            alt="Ocean"
            className="h-[585px] w-full object-cover opacity-30"
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
                name for details.
              </p>
            </div>

            <div className="hidden sm:block">
              <UiButton variant="primary" onClick={jumpToEffectiveStart}>
                <CalendarDays className="h-4 w-4" />
                Jump to start
              </UiButton>
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
                  <div className="mt-1 text-[11px] text-white/55">Empty = next Sunday ({toISODate(nextSunday(new Date()))})</div>
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
                    {BOATS.map((b) => {
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
                    Showing boats that have at least one available window {"\u2265"}{" "}
                    <span className="font-semibold text-white/70">{durationDays}</span> day(s) in this 14-day view.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Schedule */}
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
                  Starting <span className="font-semibold text-white/85">{formatMonDay(scheduleStart)}</span>{" "}
                  {"\u2022"} Duration filter: {durationDays} day(s)
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

        <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-white/10">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[260px_repeat(14,1fr)] border-b border-white/10">
              <div className="p-3 text-xs text-white/60">Boat</div>
              {days.map((d) => (
                <div key={toISODate(d)} className={cx("p-3 text-center", isSameDay(d, new Date()) ? "bg-white/5" : "")}>
                  <div className="text-[11px] text-white/55">{formatDow(d)}</div>
                  <div className="text-xs font-medium text-white">{formatMonDay(d)}</div>
                </div>
              ))}
            </div>

            {boatsFiltered.length === 0 ? (
              <div className="p-6 text-sm text-white/70">No boats match the current filters in this 14-day window.</div>
            ) : (
              boatsFiltered.map((b) => (
                <div key={b.id} className="grid grid-cols-[260px_repeat(14,1fr)] border-b border-white/10 last:border-b-0">
                  <div className="flex items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => setModalBoatId(b.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-left text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/15"
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70 ring-1 ring-white/10">
                        {b.type}
                      </span>
                    </button>
                  </div>

                  {days.map((d) => {
                    const booked = isBooked(b.id, d);
                    const windowFits = !booked && computeWindowFits(b.id, d, durationDays, scheduleStart, scheduleEnd);

                    return (
                      <div key={toISODate(d)} className="p-2">
                        <div
                          className={cx(
                            "h-9 rounded-lg ring-1 transition",
                            booked ? "bg-white/10 ring-white/10" : "bg-white/5 ring-white/10 hover:bg-white/10",
                            !booked && durationDays > 1 && windowFits ? "ring-2 ring-white/25" : ""
                          )}
                          title={
                            booked
                              ? "Booked"
                              : windowFits
                              ? `Available (${durationDays} day window fits starting here)`
                              : "Available"
                          }
                        >
                          <div className="flex h-full items-center justify-center">
                            <span className={cx("text-[11px]", booked ? "text-white/55" : "text-white/75")}>
                              {booked ? "Booked" : "Open"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal open={!!modalBoatId} onClose={() => setModalBoatId(null)} boat={modalBoat} />
    </div>
  );
}
