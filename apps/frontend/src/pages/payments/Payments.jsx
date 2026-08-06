import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';

export default function Payments() {
  const { globalSearch = '' } = useOutletContext() || {};
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (globalSearch !== undefined) setSearch(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [monthly, bookings] = await Promise.all([
          rentalApi.listPayments(),
          rentalApi.listBookings(),
        ]);
        const mapped = [
          ...monthly.map((p) => ({
            id: p.id,
            source: p.tenantType === 'shop' ? 'Shop' : 'Apartment',
            name: p.name,
            room: p.roomNumber,
            building: p.building,
            period: p.month,
            amountDue: p.amountDue,
            amountPaid: p.amountPaid,
            status: p.status,
            method: p.method,
            date: p.paymentDate,
          })),
          ...bookings
            .filter((b) => b.status !== 'Cancelled')
            .map((b) => ({
              id: b.id,
              source: 'Guest',
              name: b.fullName,
              room: b.roomNumber,
              building: b.building,
              period: `${b.checkIn} → ${b.checkOut}`,
              amountDue: b.total,
              amountPaid: b.status === 'Cancelled' ? 0 : b.total,
              status: b.status === 'CheckedOut' || b.status === 'CheckedIn' || b.status === 'Confirmed'
                ? 'Paid'
                : b.status,
              method: b.paymentMethod,
              date: b.checkIn,
              note: 'Guest stay total (collected at booking)',
            })),
        ];
        setRows(mapped);
      } catch (err) {
        toast.error(err.message || 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (type && r.source !== type) return false;
      if (status && r.status !== status) return false;
      if (!q) return true;
      return (
        String(r.name || '')
          .toLowerCase()
          .includes(q) ||
        String(r.room || '')
          .toLowerCase()
          .includes(q) ||
        String(r.building || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [rows, search, type, status]);

  return (
    <div>
      <PageHeader title="Payments" subtitle="Monthly rents and guest booking totals." />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Search"
            placeholder="Name, room, building…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="Apartment">Apartment</option>
            <option value="Shop">Shop</option>
            <option value="Guest">Guest</option>
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partial">Partial</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Room</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Paid</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={`${r.source}-${r.id}`} className="border-b border-[var(--border)]/60">
                    <td className="py-3">{r.source}</td>
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3">
                      {r.room}
                      <span className="block text-xs text-[var(--text-muted)]">{r.building}</span>
                    </td>
                    <td className="py-3">{r.period}</td>
                    <td className="py-3">{formatCurrency(r.amountDue)}</td>
                    <td className="py-3">{formatCurrency(r.amountPaid)}</td>
                    <td className="py-3">{r.method || '—'}</td>
                    <td className="py-3">
                      <Badge status={r.status}>{r.status}</Badge>
                    </td>
                    <td className="py-3">{r.date ? formatDate(r.date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="py-6 text-sm text-[var(--text-muted)]">No payments found.</p>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
