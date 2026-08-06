import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { UNIT_STATUSES, UNIT_USAGES } from '../../utils/constants.js';
import { formatCurrency } from '../../utils/format.js';
import { usageToApi } from '../../utils/labels.js';
import { rentalApi } from '../../services/rentalApi.js';

export default function Rooms() {
  const { globalSearch = '' } = useOutletContext() || {};
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [status, setStatus] = useState('');
  const [usage, setUsage] = useState('');

  useEffect(() => {
    if (globalSearch !== undefined) setSearch(globalSearch);
  }, [globalSearch]);

  const load = async () => {
    setLoading(true);
    try {
      const [b, u] = await Promise.all([rentalApi.listBuildings(), rentalApi.listUnits()]);
      setBuildings(b);
      setRooms(u);
    } catch (err) {
      toast.error(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (buildingId && r.buildingId !== buildingId) return false;
      if (status && r.status !== status) return false;
      if (usage && r.usage !== usage) return false;
      if (!q) return true;
      return (
        r.roomNumber.toLowerCase().includes(q) ||
        String(r.building || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [rooms, search, buildingId, status, usage]);

  const setStatusFor = async (id, next) => {
    try {
      await rentalApi.updateUnit(id, { status: next });
      toast.success(`Status → ${next}`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  const setUsageFor = async (id, nextUsage) => {
    try {
      await rentalApi.updateUnit(id, { usage: usageToApi(nextUsage) });
      toast.success(`Usage → ${nextUsage}`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  return (
    <div>
      <PageHeader title="Rooms" subtitle="All shops, apartments, and guest rooms." />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            placeholder="Room number or building…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select label="Building" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            <option value="">All buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select label="Usage" value={usage} onChange={(e) => setUsage(e.target.value)}>
            <option value="">All</option>
            <option value="shop">Shop</option>
            <option value="apartment">Apartment</option>
            <option value="guest">Guest</option>
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
                  <th className="pb-2 font-medium">Room</th>
                  <th className="pb-2 font-medium">Building</th>
                  <th className="pb-2 font-medium">Floor</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Usage</th>
                  <th className="pb-2 font-medium">Monthly</th>
                  <th className="pb-2 font-medium">Daily</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)]/60">
                    <td className="py-3 font-medium">{r.roomNumber}</td>
                    <td className="py-3">{r.building}</td>
                    <td className="py-3">{r.floor}</td>
                    <td className="py-3">{r.unitType}</td>
                    <td className="py-3">
                      <Select
                        value={r.usage || 'apartment'}
                        onChange={(e) => setUsageFor(r.id, e.target.value)}
                      >
                        {UNIT_USAGES.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-3">{formatCurrency(r.monthlyRent)}</td>
                    <td className="py-3">{formatCurrency(r.dailyRent)}</td>
                    <td className="py-3">
                      <Badge status={r.status}>{r.status}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {UNIT_STATUSES.filter((s) => s !== r.status).map((s) => (
                          <Button
                            key={s}
                            variant="secondary"
                            className="h-9 px-3 text-xs"
                            onClick={() => setStatusFor(r.id, s)}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="py-6 text-sm text-[var(--text-muted)]">No rooms match.</p>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
