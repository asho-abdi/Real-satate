import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import StatementModal from '../../components/finance/StatementModal.jsx';
import { rentalApi } from '../../services/rentalApi.js';

/**
 * Browse tenants / commercial customers / buyers and open financial statements.
 */
export default function Statements() {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [sales, setSales] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [search, setSearch] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [kind, setKind] = useState('ALL');
  const [party, setParty] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, b, s, buildingsList] = await Promise.all([
        rentalApi.listTenants(),
        rentalApi.listBusinesses({ commercialType: 'ALL' }),
        rentalApi.listShopSales({ commercialType: 'ALL' }),
        rentalApi.listBuildings(),
      ]);
      setTenants(t || []);
      setBusinesses(b || []);
      setSales(s || []);
      setBuildings(buildingsList || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const mapped = [
      ...(kind === 'ALL' || kind === 'TENANT'
        ? (tenants || []).map((t) => ({
            key: `t-${t.id}`,
            kind: 'Apartment tenant',
            name: t.fullName || t.name,
            phone: t.phone,
            building: t.building,
            buildingId: t.buildingId,
            unit: t.roomNumber,
            commercialType: null,
            party: { tenantId: t.id },
          }))
        : []),
      ...(kind === 'ALL' || kind === 'BUSINESS'
        ? (businesses || []).map((b) => ({
            key: `b-${b.id}`,
            kind: b.commercialType === 'OFFICE' ? 'Office rental' : 'Shop rental',
            name: b.businessName,
            phone: b.phone,
            building: b.building,
            buildingId: b.buildingId,
            unit: b.roomNumber,
            commercialType: b.commercialType,
            party: { businessId: b.id },
          }))
        : []),
      ...(kind === 'ALL' || kind === 'BUYER'
        ? (sales || []).map((s) => ({
            key: `s-${s.id}`,
            kind: s.commercialType === 'OFFICE' ? 'Office buyer' : 'Shop buyer',
            name: s.buyerName,
            phone: s.phone,
            building: s.unit?.building?.name || s.building,
            buildingId: s.unit?.building?.id || s.buildingId,
            unit: s.unit?.roomNumber || s.roomNumber,
            commercialType: s.commercialType,
            party: { shopSaleId: s.id },
          }))
        : []),
    ];

    return mapped.filter((r) => {
      if (buildingId && r.buildingId !== buildingId) return false;
      if (!q) return true;
      return [r.name, r.phone, r.unit, r.building, r.kind]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [tenants, businesses, sales, search, buildingId, kind]);

  return (
    <div>
      <PageHeader
        title="Statements"
        subtitle="Tenant and customer statements from live ledgers — opening balance, charges, payments, and closing balance."
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, unit…"
          />
          <Select label="Property" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            <option value="">All properties</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select label="Customer type" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="ALL">All</option>
            <option value="TENANT">Apartment tenants</option>
            <option value="BUSINESS">Commercial rentals</option>
            <option value="BUYER">Buyers / owners</option>
          </Select>
          <div className="flex items-end">
            <Button variant="secondary" className="h-11 w-full" onClick={load}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No customers match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Property / unit</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-[var(--border)]/60">
                    <td className="py-3">{r.kind}</td>
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3">
                      {[r.building, r.unit && `Unit ${r.unit}`].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="py-3">{r.phone || '—'}</td>
                    <td className="py-3">
                      <Button
                        variant="secondary"
                        className="h-9 px-3 text-sm"
                        onClick={() => setParty(r.party)}
                      >
                        View statement
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <StatementModal open={Boolean(party)} onClose={() => setParty(null)} party={party} />
    </div>
  );
}
