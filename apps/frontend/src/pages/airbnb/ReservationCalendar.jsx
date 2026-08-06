import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import { remReservations } from '../../services/remsData.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function overlapsDay(rsv, day) {
  const start = new Date(rsv.checkIn);
  const end = new Date(rsv.checkOut);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return day >= start && day < end;
}

export default function ReservationCalendar() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date('2026-08-01')));
  const [rows, setRows] = useState(remReservations);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ guest: '', unit: '', checkIn: '', checkOut: '', total: '' });

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const total = daysInMonth(cursor);
    const pad = first.getDay();
    const list = [];
    for (let i = 0; i < pad; i += 1) list.push(null);
    for (let d = 1; d <= total; d += 1) {
      list.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    return list;
  }, [cursor]);

  const monthLabel = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((rsv) => {
      const key = rsv.checkIn;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(rsv);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const updateStatus = (id, status) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Status → ${status}`);
  };

  return (
    <div>
      <PageHeader
        title="Reservation Calendar"
        subtitle="Month view of Airbnb occupancy windows."
        breadcrumbs={[{ label: 'Airbnb' }, { label: 'Calendar' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
              }
            >
              <MdChevronLeft />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-[var(--text)]">
              {monthLabel}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
              }
            >
              <MdChevronRight />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setForm({ guest: '', unit: '', checkIn: '', checkOut: '', total: '' });
                setFormOpen(true);
              }}
            >
              New reservation
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-2)]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[96px] border-b border-r border-[var(--border)] bg-[var(--surface-2)]/40"
                  />
                );
              }
              const hits = rows.filter((r) => overlapsDay(r, day));
              const isToday = sameDay(day, new Date());
              return (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  className={`min-h-[96px] border-b border-r border-[var(--border)] p-2 ${
                    hits.length ? 'bg-brand-50/60 dark:bg-brand-950/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-ink-950'
                          : 'text-[var(--text)]'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {hits.length > 0 ? (
                      <span className="text-[10px] font-medium text-brand-700 dark:text-brand-300">
                        {hits.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 space-y-1">
                    {hits.slice(0, 2).map((r) => (
                      <div
                        key={r.id}
                        className="truncate rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text)] shadow-sm ring-1 ring-[var(--border)]"
                      >
                        {r.unit} · {r.guest.split(' ')[0]}
                      </div>
                    ))}
                    {hits.length > 2 ? (
                      <p className="text-[10px] text-[var(--text-muted)]">+{hits.length - 2} more</p>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        <Card title="Arrivals by date">
          <ul className="space-y-4">
            {grouped.map(([date, items]) => (
              <li key={date}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {formatDate(date)}
                </p>
                <ul className="mt-2 space-y-2">
                  {items.map((rsv) => (
                    <li
                      key={rsv.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--text)]">{rsv.guest}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {rsv.unit} · {rsv.nights}n · {formatCurrency(rsv.total, 'AED')}
                          </p>
                        </div>
                        <Badge status={rsv.status}>{rsv.status}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {rsv.status === 'Pending' ? (
                          <Button size="sm" variant="secondary" onClick={() => updateStatus(rsv.id, 'Confirmed')}>
                            Confirm
                          </Button>
                        ) : null}
                        {['Confirmed', 'Pending'].includes(rsv.status) ? (
                          <Button size="sm" variant="secondary" onClick={() => updateStatus(rsv.id, 'Checked In')}>
                            Check In
                          </Button>
                        ) : null}
                        {rsv.status === 'Checked In' ? (
                          <Button size="sm" onClick={() => updateStatus(rsv.id, 'Checked Out')}>
                            Check Out
                          </Button>
                        ) : null}
                        {!['Cancelled', 'Checked Out'].includes(rsv.status) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus(rsv.id, 'Cancelled')}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="New reservation"
        footer={
          <FormActionBar
            onCancel={() => setFormOpen(false)}
            onReset={() => toast('Form reset')}
            onSaveDraft={() => toast.success('Draft saved')}
            onSave={() => {
              setRows((prev) => [
                {
                  id: `rsv-cal-${Date.now()}`,
                  code: `RSV-A-${Math.floor(Math.random() * 9000 + 1000)}`,
                  guest: form.guest,
                  unit: form.unit,
                  checkIn: form.checkIn,
                  checkOut: form.checkOut,
                  total: Number(form.total) || 0,
                  nights: 1,
                  status: 'Pending',
                  cleaningStatus: 'Clean',
                  adults: 2,
                  children: 0,
                },
                ...prev,
              ]);
              toast.success('Reservation created');
              setFormOpen(false);
            }}
            onSaveAndClose={() => {
              toast.success('Saved');
              setFormOpen(false);
            }}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Guest"
            value={form.guest}
            onChange={(e) => setForm({ ...form, guest: e.target.value })}
          />
          <Input
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            label="Check-in"
            type="date"
            value={form.checkIn}
            onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
          />
          <Input
            label="Check-out"
            type="date"
            value={form.checkOut}
            onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
          />
          <Input
            label="Total (AED)"
            type="number"
            value={form.total}
            onChange={(e) => setForm({ ...form, total: e.target.value })}
            className="sm:col-span-2"
          />
        </div>
      </Modal>
    </div>
  );
}
