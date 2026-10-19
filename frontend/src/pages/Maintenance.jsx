import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Modal from '../components/ui/Modal.jsx';
import Badge from '../components/ui/Badge.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { MAINTENANCE_STATUSES } from '../utils/constants.js';
import { formatCurrency, formatDate, cn } from '../utils/format.js';
import { labelStatus } from '../utils/labels.js';
import { rentalApi } from '../services/rentalApi.js';
import MaintenanceCard from '../components/realty/MaintenanceCard.jsx';

const emptyForm = {
  subject: '',
  amount: '',
  buildingId: '',
  unitId: '',
  workDate: new Date().toISOString().slice(0, 10),
  description: '',
  status: 'COMPLETED',
  customData: {},
};

const emptyField = {
  label: '',
  fieldType: 'text',
  options: '',
  required: false,
};

function statusBadge(status) {
  const map = {
    PLANNED: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100',
    IN_PROGRESS: 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100',
    COMPLETED: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
    CANCELLED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  };
  return map[status] || map.COMPLETED;
}

export default function Maintenance() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [units, setUnits] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState(emptyField);
  const [savingField, setSavingField] = useState(false);
  const [view, setView] = useState('list'); // list | report
  const [filters, setFilters] = useState({
    search: '',
    buildingId: searchParams.get('buildingId') || '',
    unitId: searchParams.get('unitId') || '',
    status: '',
    from: '',
    to: '',
    minAmount: '',
    maxAmount: '',
  });

  useEffect(() => {
    const buildingId = searchParams.get('buildingId') || '';
    const unitId = searchParams.get('unitId') || '';
    if (buildingId || unitId) {
      setFilters((prev) => ({
        ...prev,
        buildingId: buildingId || prev.buildingId,
        unitId: unitId || prev.unitId,
      }));
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.buildingId) params.buildingId = filters.buildingId;
      if (filters.unitId) params.unitId = filters.unitId;
      if (filters.status) params.status = filters.status;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.minAmount) params.minAmount = filters.minAmount;
      if (filters.maxAmount) params.maxAmount = filters.maxAmount;

      const [list, sum, b, u, f, rep] = await Promise.all([
        rentalApi.listMaintenance(params),
        rentalApi.getMaintenanceSummary(),
        rentalApi.listBuildings(),
        rentalApi.listUnits(),
        rentalApi.listMaintenanceFields(),
        rentalApi.getMaintenanceReport({
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
          ...(filters.buildingId ? { buildingId: filters.buildingId } : {}),
        }),
      ]);
      setRows(list || []);
      setSummary(sum);
      setBuildings(b || []);
      setUnits(u || []);
      setFields((f || []).filter((x) => x.isActive !== false));
      setReport(rep);
    } catch (err) {
      toast.error(err.message || 'Failed to load maintenance');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const unitsForBuilding = useMemo(() => {
    const bid = form.buildingId || filters.buildingId;
    if (!bid) return units;
    return units.filter((u) => u.buildingId === bid);
  }, [units, form.buildingId, filters.buildingId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      customData: Object.fromEntries(fields.map((f) => [f.key, ''])),
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      subject: row.subject || '',
      amount: String(row.amount ?? ''),
      buildingId: row.buildingId || row.building?.id || '',
      unitId: row.unitId || row.unit?.id || '',
      workDate: row.workDate ? String(row.workDate).slice(0, 10) : emptyForm.workDate,
      description: row.description || '',
      status: row.status || 'COMPLETED',
      customData: { ...(row.customData || {}) },
    });
    setDetail(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (form.amount === '' || Number.isNaN(Number(form.amount))) {
      toast.error('Amount / cost is required');
      return;
    }
    if (!form.buildingId) {
      toast.error('Select a property / building');
      return;
    }
    if (!form.workDate) {
      toast.error('Date is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        subject: form.subject.trim(),
        amount: Number(form.amount),
        buildingId: form.buildingId,
        unitId: form.unitId || null,
        workDate: form.workDate,
        description: form.description || null,
        status: form.status,
        customData: form.customData || {},
      };
      if (editingId) {
        await rentalApi.updateMaintenance(editingId, payload);
        toast.success('Maintenance updated — financials recalculated');
      } else {
        await rentalApi.createMaintenance(payload);
        toast.success('Maintenance saved — cost linked to property finances');
      }
      setOpen(false);
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not save maintenance');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm?.id) return;
    try {
      await rentalApi.deleteMaintenance(confirm.id);
      toast.success('Maintenance deleted — net revenue updated');
      setConfirm(null);
      setDetail(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not delete');
    }
  };

  const saveField = async () => {
    if (!fieldForm.label.trim()) {
      toast.error('Field label is required');
      return;
    }
    setSavingField(true);
    try {
      await rentalApi.createMaintenanceField({
        label: fieldForm.label.trim(),
        fieldType: fieldForm.fieldType,
        required: fieldForm.required,
        options:
          fieldForm.fieldType === 'select'
            ? fieldForm.options
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
      });
      toast.success('Custom field added');
      setFieldForm(emptyField);
      const f = await rentalApi.listMaintenanceFields();
      setFields((f || []).filter((x) => x.isActive !== false));
    } catch (err) {
      toast.error(err.message || 'Could not add field');
    } finally {
      setSavingField(false);
    }
  };

  const removeField = async (id) => {
    try {
      await rentalApi.deleteMaintenanceField(id);
      toast.success('Custom field removed');
      const f = await rentalApi.listMaintenanceFields();
      setFields((f || []).filter((x) => x.isActive !== false));
    } catch (err) {
      toast.error(err.message || 'Could not remove field');
    }
  };

  const setCustom = (key, value) => {
    setForm((prev) => ({
      ...prev,
      customData: { ...(prev.customData || {}), [key]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle="Record repair and maintenance work on properties. Costs reduce net revenue automatically."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="h-11 px-4" onClick={() => setFieldsOpen(true)}>
              Custom fields
            </Button>
            <Button className="h-11 px-5" onClick={openCreate}>
              + Add Maintenance
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Total records</p>
          <p className="mt-2 text-2xl font-bold">{summary?.totalRecords ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Total spent</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">
            {formatCurrency(summary?.totalSpent || 0)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">This month</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(summary?.thisMonthSpent || 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Active</p>
          <p className="mt-2 text-2xl font-bold">{summary?.activeCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Completed</p>
          <p className="mt-2 text-2xl font-bold">{summary?.completedCount ?? 0}</p>
        </Card>
      </div>

      {(summary?.byBuilding || []).length > 0 ? (
        <Card title="Spending by property">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(summary.byBuilding || []).map((b) => (
              <div
                key={b.buildingId}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3"
              >
                <p className="font-medium text-[var(--text)]">{b.buildingName}</p>
                <p className="mt-1 text-lg font-semibold text-rose-600">{formatCurrency(b.amount)}</p>
                <p className="text-xs text-[var(--text-muted)]">{b.count} record{b.count === 1 ? '' : 's'}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView('list')}
          className={cn(
            'h-10 rounded-xl px-4 text-sm font-medium',
            view === 'list'
              ? 'bg-brand-700 text-white'
              : 'bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)]',
          )}
        >
          Records
        </button>
        <button
          type="button"
          onClick={() => setView('report')}
          className={cn(
            'h-10 rounded-xl px-4 text-sm font-medium',
            view === 'report'
              ? 'bg-brand-700 text-white'
              : 'bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)]',
          )}
        >
          Report
        </button>
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Input
            label="Search"
            placeholder="Subject, code…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Select
            label="Property"
            value={filters.buildingId}
            onChange={(e) => setFilters({ ...filters, buildingId: e.target.value, unitId: '' })}
          >
            <option value="">All properties</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            label="Unit"
            value={filters.unitId}
            onChange={(e) => setFilters({ ...filters, unitId: e.target.value })}
            disabled={!filters.buildingId}
          >
            <option value="">All units</option>
            {units
              .filter((u) => !filters.buildingId || u.buildingId === filters.buildingId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.roomNumber}
                </option>
              ))}
          </Select>
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {MAINTENANCE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Input
            label="From"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
          <Input
            label="To"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Input
            label="Min amount"
            type="number"
            value={filters.minAmount}
            onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
          />
          <Input
            label="Max amount"
            type="number"
            value={filters.maxAmount}
            onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
          />
          <div className="flex items-end">
            <Button
              variant="secondary"
              className="h-11"
              onClick={() =>
                setFilters({
                  search: '',
                  buildingId: '',
                  unitId: '',
                  status: '',
                  from: '',
                  to: '',
                  minAmount: '',
                  maxAmount: '',
                })
              }
            >
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : view === 'report' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Totals">
            <p className="text-sm text-[var(--text-muted)]">Total maintenance cost</p>
            <p className="text-3xl font-bold text-rose-600">{formatCurrency(report?.totalCost || 0)}</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {report?.totalRecords || 0} records · {report?.completed || 0} completed ·{' '}
              {report?.active || 0} active
            </p>
          </Card>
          <Card title="By month">
            {(report?.byMonth || []).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No data.</p>
            ) : (
              <ul className="space-y-2">
                {(report.byMonth || []).map((m) => (
                  <li key={m.month} className="flex justify-between text-sm">
                    <span>{m.month}</span>
                    <span className="font-semibold">{formatCurrency(m.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="By property">
            {(report?.byBuilding || []).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No data.</p>
            ) : (
              <ul className="space-y-2">
                {(report.byBuilding || []).map((b) => (
                  <li key={b.buildingId} className="flex justify-between text-sm">
                    <span>{b.buildingName}</span>
                    <span className="font-semibold">{formatCurrency(b.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="By unit">
            {(report?.byUnit || []).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No unit-linked maintenance.</p>
            ) : (
              <ul className="space-y-2">
                {(report.byUnit || []).map((u) => (
                  <li key={u.unitId} className="flex justify-between text-sm">
                    <span>
                      {u.buildingName} · {u.roomNumber}
                    </span>
                    <span className="font-semibold">{formatCurrency(u.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              No maintenance records yet. Click <strong>+ Add Maintenance</strong> to create one.
            </p>
          ) : (
            <div className="grid gap-3">
              {rows.map((r) => (
                <MaintenanceCard
                  key={r.id}
                  subject={r.subject}
                  code={r.code}
                  property={r.building?.name}
                  unitLabel={r.unit?.roomNumber}
                  unitTo={r.unit?.id ? `/units/${r.unit.id}` : ''}
                  date={r.workDate}
                  amount={r.amount}
                  status={r.status}
                  notes={r.description || r.notes}
                  onOpen={() => setDetail(r)}
                  onEdit={() => openEdit(r)}
                  onDelete={() => setConfirm(r)}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {(summary?.recent || []).length > 0 && view === 'list' ? (
        <Card title="Recent activity">
          <ul className="divide-y divide-[var(--border)]">
            {summary.recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => setDetail(r)}
                  >
                    {r.subject}
                  </button>
                  <p className="text-xs text-[var(--text-muted)]">
                    {r.building?.name}
                    {r.unit?.roomNumber ? ` · ${r.unit.roomNumber}` : ''} · {formatDate(r.workDate)}
                  </p>
                </div>
                <span className="font-semibold text-rose-600">{formatCurrency(r.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={open}
        size="lg"
        onClose={() => !saving && setOpen(false)}
        title={editingId ? 'Edit maintenance' : 'Add maintenance'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-11 px-4" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="h-11 px-5" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save maintenance'}
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Write your own subject. The cost is deducted from that property&apos;s net revenue.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            className="sm:col-span-2"
            label="Subject"
            placeholder="e.g. Bathroom pipe repair"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <Input
            label="Amount / cost"
            type="number"
            min={0}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="250"
          />
          <Input
            label="Date"
            type="date"
            value={form.workDate}
            onChange={(e) => setForm({ ...form, workDate: e.target.value })}
          />
          <Select
            label="Property / building"
            value={form.buildingId}
            onChange={(e) => setForm({ ...form, buildingId: e.target.value, unitId: '' })}
          >
            <option value="">Select</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            label="Unit (optional)"
            value={form.unitId}
            onChange={(e) => setForm({ ...form, unitId: e.target.value })}
            disabled={!form.buildingId}
          >
            <option value="">Building-wide (no unit)</option>
            {unitsForBuilding.map((u) => (
              <option key={u.id} value={u.id}>
                {u.roomNumber} · {u.usage}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {MAINTENANCE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Input
            className="sm:col-span-2"
            label="Description / notes (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What was done…"
          />
        </div>

        {fields.length > 0 ? (
          <div className="mt-5 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
            <p className="text-sm font-semibold text-[var(--text)]">Extra information</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => {
                const val = form.customData?.[f.key] ?? '';
                if (f.fieldType === 'select') {
                  const opts = Array.isArray(f.options) ? f.options : [];
                  return (
                    <Select
                      key={f.key}
                      label={f.label}
                      value={val}
                      onChange={(e) => setCustom(f.key, e.target.value)}
                    >
                      <option value="">Select</option>
                      {opts.map((o) => (
                        <option key={String(o)} value={String(o)}>
                          {String(o)}
                        </option>
                      ))}
                    </Select>
                  );
                }
                return (
                  <Input
                    key={f.key}
                    label={f.label}
                    type={f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text'}
                    value={val}
                    onChange={(e) => setCustom(f.key, e.target.value)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.subject || 'Maintenance'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-11 px-4" onClick={() => setDetail(null)}>
              Close
            </Button>
            <Button className="h-11 px-4" onClick={() => openEdit(detail)}>
              Edit
            </Button>
          </div>
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-[var(--text-muted)]">Property</p>
                <p className="font-medium">{detail.building?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-muted)]">Unit</p>
                <p className="font-medium">
                  {detail.unit?.roomNumber || 'Building-wide'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-muted)]">Cost</p>
                <p className="font-semibold text-rose-600">{formatCurrency(detail.amount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-muted)]">Date</p>
                <p className="font-medium">{formatDate(detail.workDate)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-muted)]">Status</p>
                <Badge status={labelStatus(detail.status)}>{labelStatus(detail.status)}</Badge>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-muted)]">Created by</p>
                <p className="font-medium">{detail.createdByName || '—'}</p>
              </div>
            </div>
            {detail.description ? (
              <div>
                <p className="text-xs uppercase text-[var(--text-muted)]">Description</p>
                <p className="mt-1">{detail.description}</p>
              </div>
            ) : null}
            {detail.customData && Object.keys(detail.customData).length > 0 ? (
              <div>
                <p className="mb-2 text-xs uppercase text-[var(--text-muted)]">Custom information</p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(detail.customData).map(([k, v]) => {
                    const def = fields.find((f) => f.key === k);
                    if (v === '' || v == null) return null;
                    return (
                      <div key={k} className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
                        <dt className="text-xs text-[var(--text-muted)]">{def?.label || k}</dt>
                        <dd className="font-medium">{String(v)}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ) : null}
            {detail.expense?.code ? (
              <p className="text-xs text-[var(--text-muted)]">
                Linked finance entry: {detail.expense.code}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={fieldsOpen}
        onClose={() => setFieldsOpen(false)}
        title="Custom maintenance fields"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" className="h-11 px-4" onClick={() => setFieldsOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Add optional fields (contractor, worker, reference…). They appear on new records and do not
          break older ones.
        </p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Field label"
            value={fieldForm.label}
            onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
            placeholder="Contractor"
          />
          <Select
            label="Type"
            value={fieldForm.fieldType}
            onChange={(e) => setFieldForm({ ...fieldForm, fieldType: e.target.value })}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="textarea">Notes</option>
            <option value="select">Dropdown</option>
          </Select>
          {fieldForm.fieldType === 'select' ? (
            <Input
              className="sm:col-span-2"
              label="Dropdown options (comma-separated)"
              value={fieldForm.options}
              onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })}
              placeholder="Cash, E-besa, Bank"
            />
          ) : null}
        </div>
        <Button className="mb-6 h-11" onClick={saveField} disabled={savingField}>
          {savingField ? 'Adding…' : 'Add field'}
        </Button>
        <ul className="space-y-2">
          {fields.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{f.label}</span>
                <span className="ml-2 text-xs text-[var(--text-muted)]">{f.fieldType}</span>
              </span>
              <button
                type="button"
                className="text-xs text-rose-600"
                onClick={() => removeField(f.id)}
              >
                Remove
              </button>
            </li>
          ))}
          {fields.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No custom fields yet.</p>
          ) : null}
        </ul>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete maintenance?"
        message={
          confirm
            ? `Delete “${confirm.subject}” (${formatCurrency(confirm.amount)})? Net revenue will update.`
            : ''
        }
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
