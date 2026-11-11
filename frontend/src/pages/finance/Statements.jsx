import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import { initialsOf } from '../../components/layout/Sidebar.jsx';
import { MdApartment, MdDescription, MdPeople, MdRefresh, MdSearch, MdSell, MdStorefront } from 'react-icons/md';
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

  const counts = useMemo(
    () => ({ tenants: tenants.length, businesses: businesses.length, buyers: sales.length }),
    [tenants, businesses, sales],
  );

  const KIND_TONE = {
    'Apartment tenant': 'Rent',
    'Shop rental': 'Shop',
    'Office rental': 'Office',
    'Shop buyer': 'Sold',
    'Office buyer': 'Sold',
  };

  return (
    <div>
      <PageHeader
        icon={<MdDescription />}
        title="Statements"
        subtitle="Tenant and customer statements from live ledgers — opening balance, charges, payments and closing balance."
        actions={
          <Button variant="secondary" onClick={load} loading={loading}>
            <MdRefresh className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Apartment tenants', value: counts.tenants, icon: MdApartment, kindKey: 'TENANT' },
          { label: 'Commercial rentals', value: counts.businesses, icon: MdStorefront, kindKey: 'BUSINESS' },
          { label: 'Buyers / owners', value: counts.buyers, icon: MdSell, kindKey: 'BUYER' },
        ].map(({ label, value, icon: Icon, kindKey }) => (
          <button
            key={kindKey}
            type="button"
            onClick={() => setKind((k) => (k === kindKey ? 'ALL' : kindKey))}
            aria-pressed={kind === kindKey}
            className={
              'dashboard-stat-card flex items-center gap-3 p-4 text-left ' +
              (kind === kindKey ? '!border-[var(--gold)] ring-2 ring-[var(--gold)]/25' : '')
            }
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--navy)] dark:text-[var(--primary)]">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[12.5px] text-[var(--text-muted)]">{label}</span>
              <span className="block font-display text-[22px] font-bold leading-tight text-[var(--text)]">
                {loading ? '—' : value}
              </span>
            </span>
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Search"
            icon={<MdSearch />}
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
        </div>
      </Card>

      {loading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MdPeople}
          title="No customers match"
          description="Try a different name, property or customer type."
        />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
            <p className="text-[13px] text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text)]">{rows.length}</span> customer{rows.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr>
                  <th className="!rounded-none pl-5">Customer</th>
                  <th className="!rounded-none">Type</th>
                  <th className="!rounded-none">Property / unit</th>
                  <th className="!rounded-none pr-5 text-right">Statement</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-bold text-[var(--text-secondary)]">
                          {initialsOf(r.name)}
                        </span>
                        <span>
                          <span className="block font-semibold text-[var(--text)]">{r.name || '—'}</span>
                          <span className="block text-xs text-[var(--text-muted)]">{r.phone || 'No phone'}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge status={KIND_TONE[r.kind]}>{r.kind}</Badge>
                    </td>
                    <td className="text-[var(--text-secondary)]">
                      {[r.building, r.unit && `Unit ${r.unit}`].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="pr-5 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setParty(r.party)}>
                        <MdDescription className="h-3.5 w-3.5" /> View statement
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <StatementModal open={Boolean(party)} onClose={() => setParty(null)} party={party} />
    </div>
  );
}
