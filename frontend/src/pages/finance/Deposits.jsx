import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import { MdAccountBalanceWallet, MdAdd, MdLock, MdPendingActions, MdSearch, MdUndo } from 'react-icons/md';
import PaymentMethodFields from '../../components/payments/PaymentMethodFields.jsx';
import { formatCurrency, formatDate, formatRoomLocation } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'HELD', label: 'Held' },
  { value: 'PARTIALLY_RETURNED', label: 'Partially returned' },
  { value: 'FULLY_RETURNED', label: 'Fully returned' },
  { value: 'DEDUCTED', label: 'Deducted' },
];

const TXN_LABEL = {
  RECEIVED: 'Received',
  RETURN: 'Returned',
  DEDUCTION: 'Deduction',
};

function statusLabel(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'HELD') return 'Held';
  if (s === 'PARTIALLY_RETURNED') return 'Partial';
  if (s === 'FULLY_RETURNED') return 'Returned';
  if (s === 'DEDUCTED') return 'Deducted';
  return status || '—';
}

function customerName(row) {
  return (
    row.tenant?.fullName ||
    row.business?.businessName ||
    row.shopSale?.buyerName ||
    '—'
  );
}

function num(row, key) {
  return Number(row?.[key] ?? 0);
}

export default function Deposits() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buildingId, setBuildingId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    partyType: 'tenant',
    tenantId: '',
    businessId: '',
    unitId: '',
    amount: '',
    dateReceived: new Date().toISOString().slice(0, 10),
    method: 'CASH',
    reference: '',
    receivedByName: '',
    agentName: '',
    officeMpesaNumber: '',
    notes: '',
  });

  const [settleForm, setSettleForm] = useState({
    returnAmount: '',
    deductAmount: '',
    returnMethod: 'CASH',
    reference: '',
    reason: '',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (buildingId) params.buildingId = buildingId;
      if (status) params.status = status;
      const [list, sum] = await Promise.all([
        rentalApi.listDeposits(params),
        rentalApi.getDepositSummary(),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setSummary(sum || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load deposits');
    } finally {
      setLoading(false);
    }
  }, [buildingId, status]);

  const loadLookups = useCallback(async () => {
    try {
      const [b, t, biz, u] = await Promise.all([
        rentalApi.listBuildings(),
        rentalApi.listTenants(),
        rentalApi.listBusinesses({ commercialType: 'ALL' }),
        rentalApi.listUnits(),
      ]);
      setBuildings(b || []);
      setTenants(t || []);
      setBusinesses(biz || []);
      setUnits(u || []);
    } catch {
      /* optional for create form */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = customerName(r).toLowerCase();
      const room = String(r.unit?.roomNumber || '').toLowerCase();
      const bld = String(r.unit?.building?.name || '').toLowerCase();
      const notes = String(r.notes || '').toLowerCase();
      return name.includes(q) || room.includes(q) || bld.includes(q) || notes.includes(q);
    });
  }, [rows, search]);

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Held (liability)', value: summary.held },
      { label: 'Outstanding to return', value: summary.outstandingToReturn },
      { label: 'Deposits held', value: summary.countHeld },
      { label: 'Partially settled', value: summary.countPartial },
    ];
  }, [summary]);

  const openDetail = async (row) => {
    setDetail(row);
    setDetailLoading(true);
    try {
      const full = await rentalApi.getDeposit(row.id);
      setDetail(full);
    } catch (err) {
      toast.error(err.message || 'Could not load deposit');
    } finally {
      setDetailLoading(false);
    }
  };

  const openSettle = (row) => {
    const remaining = num(row, 'remainingAmount');
    setSettleForm({
      returnAmount: String(remaining),
      deductAmount: '',
      returnMethod: 'CASH',
      reference: '',
      reason: '',
      notes: '',
    });
    setSettleOpen(row);
  };

  const saveCreate = async () => {
    const amount = Number(createForm.amount);
    if (!(amount > 0)) {
      toast.error('Enter a deposit amount');
      return;
    }
    if (!createForm.unitId) {
      toast.error('Select a unit');
      return;
    }
    const tenantId = createForm.partyType === 'tenant' ? createForm.tenantId : null;
    const businessId = createForm.partyType === 'business' ? createForm.businessId : null;
    if (!tenantId && !businessId) {
      toast.error('Select a tenant or business');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.createDeposit({
        tenantId,
        businessId,
        unitId: createForm.unitId,
        amount,
        dateReceived: createForm.dateReceived,
        method: createForm.method,
        reference: createForm.reference || null,
        receivedByName: createForm.receivedByName || null,
        agentName: createForm.agentName || null,
        officeMpesaNumber: createForm.officeMpesaNumber || null,
        notes: createForm.notes || null,
      });
      toast.success('Deposit recorded');
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not record deposit');
    } finally {
      setSaving(false);
    }
  };

  const saveSettle = async () => {
    if (!settleOpen) return;
    const returnAmount = Number(settleForm.returnAmount) || 0;
    const deductAmount = Number(settleForm.deductAmount) || 0;
    if (returnAmount <= 0 && deductAmount <= 0) {
      toast.error('Enter a return and/or deduction amount');
      return;
    }
    if (deductAmount > 0 && !String(settleForm.reason || settleForm.notes || '').trim()) {
      toast.error('Reason is required for deductions');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.settleDeposit(settleOpen.id, {
        returnAmount,
        deductAmount,
        returnMethod: settleForm.returnMethod,
        reference: settleForm.reference || null,
        reason: settleForm.reason || null,
        notes: settleForm.notes || null,
      });
      toast.success('Deposit settled');
      setSettleOpen(null);
      setDetail(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not settle deposit');
    } finally {
      setSaving(false);
    }
  };

  const unitsForCreate = useMemo(() => {
    return units.filter((u) => u.id);
  }, [units]);

  const tenantsForUnit = useMemo(() => {
    if (!createForm.unitId) return tenants;
    return tenants.filter((t) => t.unitId === createForm.unitId || t.roomId === createForm.unitId);
  }, [tenants, createForm.unitId]);

  const businessesForUnit = useMemo(() => {
    if (!createForm.unitId) return businesses;
    return businesses.filter((b) => b.unitId === createForm.unitId);
  }, [businesses, createForm.unitId]);

  const SUMMARY_ICONS = [MdAccountBalanceWallet, MdUndo, MdLock, MdPendingActions];

  return (
    <div>
      <PageHeader
        icon={<MdAccountBalanceWallet />}
        title="Security Deposits"
        subtitle="Deposits held on behalf of tenants (a liability), returns and checkout deductions."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <MdAdd className="h-4 w-4" /> Record deposit
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {(summaryCards.length ? summaryCards : [{}, {}, {}, {}]).map((c, i) => {
          const Icon = SUMMARY_ICONS[i];
          const isCount = c.label === 'Deposits held' || c.label === 'Partially settled';
          return (
            <div key={c.label || i} className="dashboard-stat-card relative overflow-hidden p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-medium text-[var(--text-muted)] sm:text-[12.5px]">{c.label || 'Loading…'}</p>
                <span
                  className={
                    'hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ' +
                    (i === 0 ? 'bg-[var(--gold-soft)] text-[var(--accent)]' : 'bg-[var(--primary-light)] text-[var(--navy)] dark:text-[var(--primary)]')
                  }
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              </div>
              <p className="mt-2 truncate font-display text-[17px] font-bold text-[var(--text)] sm:text-[22px]">
                {c.label ? (isCount ? c.value ?? 0 : formatCurrency(c.value)) : '—'}
              </p>
              {i === 0 ? <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--gold)]" aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Search"
            icon={<MdSearch />}
            placeholder="Customer, unit, notes…"
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
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MdAccountBalanceWallet}
          title="No deposits found"
          description={search || status || buildingId ? 'Try clearing the filters.' : 'Record a deposit when a tenant moves in.'}
          action={
            !search && !status && !buildingId ? (
              <Button onClick={() => setCreateOpen(true)}>
                <MdAdd className="h-4 w-4" /> Record deposit
              </Button>
            ) : null
          }
        />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr>
                  <th className="!rounded-none pl-5">Customer</th>
                  <th className="!rounded-none">Unit</th>
                  <th className="!rounded-none">Received</th>
                  <th className="!rounded-none text-right">Amount</th>
                  <th className="!rounded-none text-right">Remaining</th>
                  <th className="!rounded-none">Status</th>
                  <th className="!rounded-none pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="pl-5 font-semibold text-[var(--text)]">{customerName(r)}</td>
                    <td>
                      <span className="font-medium">{r.unit?.roomNumber || '—'}</span>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {formatRoomLocation({
                          building: r.unit?.building?.name,
                          floor: r.unit?.floor?.name,
                        })}
                      </span>
                    </td>
                    <td className="text-[var(--text-secondary)]">{r.dateReceived ? formatDate(r.dateReceived) : '—'}</td>
                    <td className="text-right tabular-nums">{formatCurrency(num(r, 'amount'))}</td>
                    <td className="text-right font-semibold tabular-nums text-[var(--text)]">
                      {formatCurrency(num(r, 'remainingAmount'))}
                    </td>
                    <td>
                      <Badge status={statusLabel(r.status)}>{statusLabel(r.status)}</Badge>
                    </td>
                    <td className="pr-5">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => openDetail(r)}>
                          View
                        </Button>
                        {num(r, 'remainingAmount') > 0 ? (
                          <Button size="sm" variant="secondary" onClick={() => openSettle(r)}>
                            Settle
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={Boolean(detail)}
        onClose={() => !detailLoading && setDetail(null)}
        title="Deposit detail"
        footer={
          detail && num(detail, 'remainingAmount') > 0 ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Close
              </Button>
              <Button onClick={() => openSettle(detail)}>Settle</Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          )
        }
      >
        {detailLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Customer</p>
                <p className="font-medium">{customerName(detail)}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Unit</p>
                <p className="font-medium">{detail.unit?.roomNumber || '—'}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Original amount</p>
                <p className="font-medium">{formatCurrency(num(detail, 'amount'))}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Remaining</p>
                <p className="font-semibold">{formatCurrency(num(detail, 'remainingAmount'))}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Returned</p>
                <p>{formatCurrency(num(detail, 'returnedAmount'))}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Deducted</p>
                <p>{formatCurrency(num(detail, 'deductedAmount'))}</p>
              </div>
            </div>
            {detail.notes ? (
              <p className="text-sm text-[var(--text-muted)]">{detail.notes}</p>
            ) : null}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Transactions
              </p>
              {(detail.transactions || []).length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No transactions yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.transactions || []).map((t) => (
                      <tr key={t.id} className="border-b border-[var(--border)]/60">
                        <td className="py-2">{TXN_LABEL[t.type] || t.type}</td>
                        <td className="py-2">{formatCurrency(num(t, 'amount'))}</td>
                        <td className="py-2">{t.createdAt ? formatDate(t.createdAt) : '—'}</td>
                        <td className="py-2">{t.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Record security deposit"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={saveCreate}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Party type"
            value={createForm.partyType}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                partyType: e.target.value,
                tenantId: '',
                businessId: '',
              })
            }
          >
            <option value="tenant">Tenant (apartment)</option>
            <option value="business">Business (shop/office)</option>
          </Select>
          <Select
            label="Unit"
            value={createForm.unitId}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                unitId: e.target.value,
                tenantId: '',
                businessId: '',
              })
            }
          >
            <option value="">Select unit</option>
            {unitsForCreate.map((u) => (
              <option key={u.id} value={u.id}>
                {u.roomNumber} — {u.building}
              </option>
            ))}
          </Select>
          {createForm.partyType === 'tenant' ? (
            <Select
              label="Tenant"
              className="sm:col-span-2"
              value={createForm.tenantId}
              onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value })}
            >
              <option value="">Select tenant</option>
              {tenantsForUnit.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName || t.name}
                </option>
              ))}
            </Select>
          ) : (
            <Select
              label="Business"
              className="sm:col-span-2"
              value={createForm.businessId}
              onChange={(e) => setCreateForm({ ...createForm, businessId: e.target.value })}
            >
              <option value="">Select business</option>
              {businessesForUnit.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.businessName || b.name}
                </option>
              ))}
            </Select>
          )}
          <Input
            label="Amount"
            type="number"
            min={0}
            value={createForm.amount}
            onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
          />
          <Input
            label="Date received"
            type="date"
            value={createForm.dateReceived}
            onChange={(e) => setCreateForm({ ...createForm, dateReceived: e.target.value })}
          />
          <div className="sm:col-span-2">
            <PaymentMethodFields
              value={createForm}
              onChange={(next) => setCreateForm({ ...createForm, ...next })}
            />
          </div>
          <Input
            label="Notes"
            className="sm:col-span-2"
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(settleOpen)}
        onClose={() => !saving && setSettleOpen(null)}
        title="Settle deposit"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setSettleOpen(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={saveSettle}>
              {saving ? 'Saving…' : 'Confirm settlement'}
            </Button>
          </div>
        }
      >
        {settleOpen ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm text-[var(--text-muted)]">
              Remaining: {formatCurrency(num(settleOpen, 'remainingAmount'))} — return to customer
              and/or deduct for damages or unpaid charges.
            </p>
            <Input
              label="Return amount"
              type="number"
              min={0}
              value={settleForm.returnAmount}
              onChange={(e) => setSettleForm({ ...settleForm, returnAmount: e.target.value })}
            />
            <Input
              label="Deduct amount"
              type="number"
              min={0}
              value={settleForm.deductAmount}
              onChange={(e) => setSettleForm({ ...settleForm, deductAmount: e.target.value })}
            />
            <Select
              label="Return method"
              value={settleForm.returnMethod}
              onChange={(e) => setSettleForm({ ...settleForm, returnMethod: e.target.value })}
            >
              <option value="CASH">Cash</option>
              <option value="MPESA">M-Pesa</option>
              <option value="AGENT">Agent</option>
            </Select>
            <Input
              label="Reference"
              value={settleForm.reference}
              onChange={(e) => setSettleForm({ ...settleForm, reference: e.target.value })}
            />
            <Input
              label="Deduction reason"
              className="sm:col-span-2"
              value={settleForm.reason}
              onChange={(e) => setSettleForm({ ...settleForm, reason: e.target.value })}
              placeholder="Required if deducting"
            />
            <Input
              label="Notes"
              className="sm:col-span-2"
              value={settleForm.notes}
              onChange={(e) => setSettleForm({ ...settleForm, notes: e.target.value })}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
