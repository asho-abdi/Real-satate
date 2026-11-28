import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdChevronLeft,
  MdChevronRight,
  MdHotel,
  MdMeetingRoom,
  MdSearch,
  MdToday,
} from 'react-icons/md';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { rentalApi } from '../../services/rentalApi.js';
import { cn } from '../../utils/format.js';
import QuickBookingModal from './QuickBookingModal.jsx';
import { useBuildingWorkspaceOptional } from '../../context/BuildingWorkspaceContext.jsx';

const STATUS_COLORS = {
  CONFIRMED: { bg: '#2563eb', fg: '#ffffff', label: 'Confirmed' },
  CHECKED_IN: { bg: '#15803d', fg: '#ffffff', label: 'Checked-in' },
  CHECKED_OUT: { bg: '#6b7280', fg: '#ffffff', label: 'Checked-out' },
  CANCELLED: { bg: '#dc2626', fg: '#ffffff', label: 'Cancelled' },
  MAINTENANCE: { bg: '#374151', fg: '#f3f4f6', label: 'Maintenance' },
};

const VIEW_DAYS = { day: 1, week: 7, month: 31 };

function ymd(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDaysYmd(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

function daysBetween(a, b) {
  const ms = parseYmd(b) - parseYmd(a);
  return Math.round(ms / 86400000);
}

function weekdayLabel(s) {
  return parseYmd(s).toLocaleDateString('en-GB', { weekday: 'short' });
}

function dayNum(s) {
  return parseYmd(s).getDate();
}

function monthLabel(s) {
  return parseYmd(s).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function StatCard({ label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'border-[var(--border)] bg-[var(--surface)]',
    good: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20',
    warn: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20',
    navy: 'border-[var(--border)] bg-[var(--primary-light)]',
  };
  return (
    <div className={cn('rounded-xl border px-3.5 py-3 shadow-xs', tones[tone] || tones.default)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-[var(--navy)] dark:text-[var(--text)]">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

function BookingBar({ booking, left, width, rowHeight, onClick, onDragStart, highlight }) {
  const colors = STATUS_COLORS[booking.status] || STATUS_COLORS.CONFIRMED;
  const movable = booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN';
  return (
    <button
      type="button"
      draggable={movable}
      onDragStart={(e) => onDragStart?.(e, booking)}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(booking);
      }}
      title={`${booking.fullName} · ${booking.code} · ${booking.checkIn} → ${booking.checkOut}`}
      className={cn(
        'absolute top-1.5 z-[2] flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-md px-2 text-left shadow-sm transition-[transform,box-shadow] hover:z-[3] hover:brightness-105 hover:shadow-md',
        movable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        highlight && 'ring-2 ring-[var(--gold)] ring-offset-1',
      )}
      style={{
        left,
        width: Math.max(width, 28),
        height: rowHeight - 12,
        background: colors.bg,
        color: colors.fg,
      }}
    >
      <span className="truncate text-[11px] font-semibold leading-tight">{booking.fullName}</span>
      <span className="hidden truncate text-[10px] opacity-90 sm:inline">{booking.code}</span>
    </button>
  );
}

/**
 * Hotel-style guest availability timeline (rooms × dates).
 */
export default function AvailabilityCalendar({ onOpenBooking, onBookingsChanged }) {
  const workspace = useBuildingWorkspaceOptional();
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(() => ymd(new Date()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [unitType, setUnitType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [quickBook, setQuickBook] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [moving, setMoving] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const scrollerRef = useRef(null);
  const dragRef = useRef(null);

  const days = VIEW_DAYS[view] || 7;
  const cellW = view === 'day' ? 160 : view === 'week' ? 64 : 40;
  const labelW = 168;
  const rowH = 44;

  const dateColumns = useMemo(() => {
    const cols = [];
    for (let i = 0; i < days; i += 1) cols.push(addDaysYmd(anchor, i));
    return cols;
  }, [anchor, days]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await rentalApi.getBookingCalendar({
        from: anchor,
        days,
        ...(buildingId && { buildingId }),
        ...(floorId && { floorId }),
        ...(roomId && { unitId: roomId }),
        ...(unitType && { unitType }),
        ...(statusFilter && { status: statusFilter }),
        ...(appliedSearch && { search: appliedSearch }),
      });
      setData(payload);
    } catch (err) {
      toast.error(err.message || 'Failed to load calendar');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [anchor, days, buildingId, floorId, roomId, unitType, statusFilter, appliedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!workspace?.selectedBuildingId) return;
    setBuildingId(workspace.selectedBuildingId);
    setFloorId('');
    setRoomId('');
  }, [workspace?.selectedBuildingId]);

  useEffect(() => {
    if (!appliedSearch || !data?.bookings?.length) return;
    const match = data.bookings.find((b) =>
      [b.fullName, b.code, b.phone].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(appliedSearch.toLowerCase()),
      ),
    );
    if (match) {
      setHighlightId(match.id);
      const t = setTimeout(() => setHighlightId(null), 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [appliedSearch, data]);

  const buildings = useMemo(() => {
    const map = new Map();
    for (const r of data?.rooms || []) {
      if (r.buildingId) map.set(r.buildingId, r.building || r.buildingCode || r.buildingId);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [data]);

  const floors = useMemo(() => {
    const map = new Map();
    for (const r of data?.rooms || []) {
      if (buildingId && r.buildingId !== buildingId) continue;
      if (r.floorId) map.set(r.floorId, r.floor || r.floorId);
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [data, buildingId]);

  const roomsForFilter = useMemo(() => {
    return (data?.rooms || [])
      .filter((r) => (!buildingId || r.buildingId === buildingId) && (!floorId || r.floorId === floorId))
      .map((r) => ({ value: r.id, label: r.roomNumber }));
  }, [data, buildingId, floorId]);

  const unitTypes = useMemo(() => {
    const set = new Set((data?.rooms || []).map((r) => r.unitType).filter(Boolean));
    return [...set].map((v) => ({ value: v, label: String(v).replaceAll('_', ' ') }));
  }, [data]);

  const rooms = data?.rooms || [];
  const bookings = data?.bookings || [];
  const blocks = data?.blocks || [];
  const stats = data?.stats || {};
  const today = data?.today || ymd(new Date());
  const gridWidth = dateColumns.length * cellW;

  const bookingsByRoom = useMemo(() => {
    const map = new Map();
    for (const b of [...bookings, ...blocks]) {
      if (!map.has(b.unitId)) map.set(b.unitId, []);
      map.get(b.unitId).push(b);
    }
    return map;
  }, [bookings, blocks]);

  const barGeometry = (booking) => {
    const startIdx = daysBetween(anchor, booking.checkIn);
    const endIdx = daysBetween(anchor, booking.checkOut);
    const leftIdx = Math.max(0, startIdx);
    const rightIdx = Math.min(days, endIdx);
    if (rightIdx <= leftIdx) return null;
    return {
      left: leftIdx * cellW + 2,
      width: (rightIdx - leftIdx) * cellW - 4,
    };
  };

  const goToday = () => setAnchor(ymd(new Date()));
  const goPrev = () => setAnchor((a) => addDaysYmd(a, -days));
  const goNext = () => setAnchor((a) => addDaysYmd(a, days));

  const onCellClick = (room, date) => {
    if (room.status === 'MAINTENANCE') {
      toast.error('Room is under maintenance');
      return;
    }
    const occupied = (bookingsByRoom.get(room.id) || []).some((b) => {
      if (b.status === 'CANCELLED' || b.status === 'CHECKED_OUT') return false;
      if (b.status === 'MAINTENANCE') return true;
      return b.checkIn <= date && date < b.checkOut;
    });
    if (occupied) {
      toast.error('This night is already occupied');
      return;
    }
    setQuickBook({ room, checkIn: date });
  };

  const handleDragStart = (e, booking) => {
    dragRef.current = {
      booking,
      nights: Math.max(1, daysBetween(booking.checkIn, booking.checkOut)),
    };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', booking.id);
  };

  const handleCellDragOver = (e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCellDrop = (e, room, date) => {
    e.preventDefault();
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.booking) return;
    if (room.status === 'MAINTENANCE') {
      toast.error('Cannot move onto a maintenance room');
      return;
    }
    const nights = drag.nights;
    const nextCheckIn = date;
    const nextCheckOut = addDaysYmd(date, nights);
    const same =
      drag.booking.unitId === room.id &&
      drag.booking.checkIn === nextCheckIn &&
      drag.booking.checkOut === nextCheckOut;
    if (same) return;

    setPendingMove({
      booking: drag.booking,
      unitId: room.id,
      roomNumber: room.roomNumber,
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
      nights,
    });
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    setMoving(true);
    try {
      await rentalApi.rescheduleBooking(pendingMove.booking.id, {
        unitId: pendingMove.unitId,
        checkIn: pendingMove.checkIn,
        checkOut: pendingMove.checkOut,
      });
      toast.success(`Moved ${pendingMove.booking.code} to room ${pendingMove.roomNumber}`);
      setPendingMove(null);
      await load();
      onBookingsChanged?.();
    } catch (err) {
      toast.error(err.message || 'Move rejected');
    } finally {
      setMoving(false);
    }
  };

  const applyGuestSearch = () => setAppliedSearch(guestSearch.trim());

  return (
    <div className="space-y-4">
      {/* Occupancy stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Guest rooms" value={stats.totalRooms ?? '—'} tone="navy" />
        <StatCard label="Available" value={stats.availableRooms ?? '—'} tone="good" />
        <StatCard label="Occupied" value={stats.occupiedRooms ?? '—'} />
        <StatCard label="Reserved" value={stats.reservedRooms ?? '—'} tone="warn" />
        <StatCard label="Maintenance" value={stats.maintenanceRooms ?? '—'} />
        <StatCard
          label="Occupancy"
          value={stats.occupancyPercent != null ? `${stats.occupancyPercent}%` : '—'}
          hint="Focus day in view"
          tone="navy"
        />
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-[var(--surface-2)] p-0.5 ring-1 ring-[var(--border)]">
            {[
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  'h-8 rounded-md px-3 text-xs font-semibold transition-colors',
                  view === v.id
                    ? 'bg-[var(--navy)] text-white dark:bg-[var(--gold)] dark:text-[var(--on-gold)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={goPrev} aria-label="Previous">
              <MdChevronLeft className="text-lg" />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToday}>
              <MdToday className="mr-1" />
              Today
            </Button>
            <Button variant="secondary" size="sm" onClick={goNext} aria-label="Next">
              <MdChevronRight className="text-lg" />
            </Button>
          </div>

          <p className="font-display text-sm font-semibold text-[var(--navy)] dark:text-[var(--text)]">
            {monthLabel(anchor)}
            <span className="ml-2 font-sans text-xs font-normal text-[var(--text-muted)]">
              {anchor} → {addDaysYmd(anchor, days - 1)}
            </span>
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Select
            label="Building"
            value={buildingId}
            onChange={(e) => {
              setBuildingId(e.target.value);
              setFloorId('');
              setRoomId('');
            }}
          >
            <option value="">All buildings</option>
            {buildings.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Floor"
            value={floorId}
            onChange={(e) => {
              setFloorId(e.target.value);
              setRoomId('');
            }}
          >
            <option value="">All floors</option>
            {floors.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Room"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            <option value="">All rooms</option>
            {roomsForFilter.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Room type"
            value={unitType}
            onChange={(e) => setUnitType(e.target.value)}
          >
            <option value="">All types</option>
            {unitTypes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Active on calendar</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked-in</option>
            <option value="CHECKED_OUT">Checked-out</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
              Find guest
            </label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--navy)] focus:ring-[3px] focus:ring-[var(--ring)]"
                  placeholder="Name, phone, or booking code"
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyGuestSearch();
                  }}
                />
              </div>
              <Button variant="secondary" onClick={applyGuestSearch}>
                Locate
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Legend
          </span>
          {(data?.legend || Object.entries(STATUS_COLORS).map(([key, v]) => ({ key, ...v }))).map(
            (item) => (
              <span key={item.key} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: item.color || STATUS_COLORS[item.key]?.bg }}
                />
                {item.label}
              </span>
            ),
          )}
        </div>
      </div>

      {/* Timeline grid */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
        {loading && !data ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : rooms.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <MdMeetingRoom className="mx-auto text-3xl text-[var(--text-muted)]" />
            <p className="mt-2 font-semibold text-[var(--text)]">No guest rooms match these filters</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Add guest rooms in Buildings, or widen the filters.
            </p>
          </div>
        ) : (
          <div ref={scrollerRef} className="relative max-h-[min(70vh,820px)] overflow-auto">
            <div style={{ minWidth: labelW + gridWidth }}>
              {/* Sticky header */}
              <div className="sticky top-0 z-20 flex border-b border-[var(--border)] bg-[var(--surface)]">
                <div
                  className="sticky left-0 z-30 flex shrink-0 items-end border-r border-[var(--border)] bg-[var(--surface)] px-3 pb-2 pt-3"
                  style={{ width: labelW }}
                >
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    <MdHotel /> Rooms
                  </span>
                </div>
                <div className="flex" style={{ width: gridWidth }}>
                  {dateColumns.map((d) => {
                    const isToday = d === today;
                    const isWeekend = [0, 6].includes(parseYmd(d).getDay());
                    return (
                      <div
                        key={d}
                        className={cn(
                          'flex shrink-0 flex-col items-center justify-end border-r border-[var(--border)]/70 py-2',
                          isToday && 'bg-[color-mix(in_oklab,var(--gold)_18%,transparent)]',
                          isWeekend && !isToday && 'bg-[var(--surface-2)]/60',
                        )}
                        style={{ width: cellW }}
                      >
                        <span className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
                          {weekdayLabel(d)}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
                            isToday
                              ? 'bg-[var(--navy)] text-white dark:bg-[var(--gold)] dark:text-[var(--on-gold)]'
                              : 'text-[var(--text)]',
                          )}
                        >
                          {dayNum(d)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rows */}
              {rooms.map((room) => {
                const rowItems = bookingsByRoom.get(room.id) || [];
                return (
                  <div
                    key={room.id}
                    className="group flex border-b border-[var(--border)]/80 hover:bg-[var(--surface-2)]/40"
                    style={{ height: rowH }}
                  >
                    <div
                      className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-[var(--border)] bg-[var(--surface)] px-3 group-hover:bg-[var(--surface-2)]"
                      style={{ width: labelW }}
                    >
                      <p className="truncate text-sm font-semibold text-[var(--navy)] dark:text-[var(--text)]">
                        {room.roomNumber}
                      </p>
                      <p className="truncate text-[10px] text-[var(--text-muted)]">
                        {[room.floor, room.building].filter(Boolean).join(' · ')}
                        {room.status === 'MAINTENANCE' ? ' · Maintenance' : ''}
                      </p>
                    </div>
                    <div className="relative flex" style={{ width: gridWidth, height: rowH }}>
                      {dateColumns.map((d) => {
                        const isToday = d === today;
                        return (
                          <div
                            key={`${room.id}-${d}`}
                            className={cn(
                              'absolute top-0 h-full border-r border-[var(--border)]/50',
                              isToday && 'bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]',
                            )}
                            style={{
                              left: daysBetween(anchor, d) * cellW,
                              width: cellW,
                            }}
                            onClick={() => onCellClick(room, d)}
                            onDragOver={handleCellDragOver}
                            onDrop={(e) => handleCellDrop(e, room, d)}
                          />
                        );
                      })}
                      {rowItems.map((booking) => {
                        const geo = barGeometry(booking);
                        if (!geo) return null;
                        return (
                          <BookingBar
                            key={booking.id}
                            booking={booking}
                            left={geo.left}
                            width={geo.width}
                            rowHeight={rowH}
                            highlight={highlightId === booking.id}
                            onDragStart={handleDragStart}
                            onClick={(b) => {
                              if (b.status === 'MAINTENANCE') return;
                              onOpenBooking?.(b.id);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {loading ? (
              <div className="pointer-events-none absolute inset-0 bg-[var(--surface)]/40">
                <div className="flex h-full items-center justify-center">
                  <Spinner />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Click an empty cell to book · Click a reservation for details · Drag a confirmed or checked-in
        stay to move rooms or dates. Check-out day is free for the next guest.
      </p>

      <QuickBookingModal
        open={Boolean(quickBook)}
        room={quickBook?.room}
        checkIn={quickBook?.checkIn}
        onClose={() => setQuickBook(null)}
        onCreated={() => {
          load();
          onBookingsChanged?.();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingMove)}
        onClose={() => setPendingMove(null)}
        onConfirm={confirmMove}
        loading={moving}
        title="Confirm reservation move"
        message={
          pendingMove
            ? `Move ${pendingMove.booking.code} (${pendingMove.booking.fullName}) to room ${pendingMove.roomNumber} for ${pendingMove.checkIn} → ${pendingMove.checkOut} (${pendingMove.nights} night${pendingMove.nights === 1 ? '' : 's'})? Availability will be re-checked before saving.`
            : ''
        }
        confirmLabel="Move booking"
      />
    </div>
  );
}
