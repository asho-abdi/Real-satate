import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdChevronRight } from 'react-icons/md';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { rentalApi } from '../../services/rentalApi.js';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { TRANSACTION_TYPES } from '../../utils/constants.js';
import { labelStatus } from '../../utils/labels.js';
import {
  ALL_BUILDING_PROPERTY_TYPES,
  BUILDING_PROPERTY_TYPE_OPTIONS,
  normalizePropertyTypes,
} from '../../utils/buildingFeatures.js';
import { useBuildingWorkspaceOptional } from '../../context/BuildingWorkspaceContext.jsx';

const emptyForm = {
  name: '',
  code: '',
  address: '',
  floorsCount: 4,
  notes: '',
  transactionType: 'FOR_RENT',
  propertyTypes: [...ALL_BUILDING_PROPERTY_TYPES],
};

export default function Buildings() {
  const { globalSearch = '' } = useOutletContext() || {};
  const workspace = useBuildingWorkspaceOptional();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      setBuildings(await rentalApi.listBuildings());
    } catch (err) {
      toast.error(err.message || 'Failed to load buildings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredBuildings = useMemo(() => {
    const q = String(globalSearch || '').trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter((b) =>
      [b.name, b.code, b.address, b.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [buildings, globalSearch]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name: b.name || '',
      code: b.code || '',
      address: b.address || '',
      floorsCount: b.floorsCount ?? 4,
      notes: b.notes || '',
      transactionType: b.transactionType || 'FOR_RENT',
      propertyTypes: normalizePropertyTypes(b.propertyTypes),
    });
    setOpen(true);
  };

  const togglePropertyType = (value) => {
    setForm((prev) => {
      const set = new Set(prev.propertyTypes || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, propertyTypes: normalizePropertyTypes([...set]) };
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    if (!form.propertyTypes?.length) {
      toast.error('Select at least one property type for this building');
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim() || null,
        floorsCount: Number(form.floorsCount) || 0,
        notes: form.notes.trim() || null,
        transactionType: form.transactionType || 'FOR_RENT',
        propertyTypes: normalizePropertyTypes(form.propertyTypes),
      };
      if (editing) {
        await rentalApi.updateBuilding(editing.id, payload);
        toast.success('Building updated');
      } else {
        await rentalApi.createBuilding(payload);
        toast.success('Building added');
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
      workspace?.refreshBuildings?.();
    } catch (err) {
      toast.error(err.message || 'Could not save building');
    }
  };

  return (
    <div>
      <PageHeader
        title="Buildings"
        subtitle="Register buildings, then floors and units. You choose shop, apartment, or guest per unit."
        actions={
          <Button onClick={openCreate}>
            Add Building
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredBuildings.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--text-muted)]">
                {globalSearch ? 'No buildings match your search.' : 'No buildings yet.'}
              </p>
            </Card>
          ) : null}
          {filteredBuildings.map((b) => (
            <Card key={b.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                    {b.code}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">{b.name}</h2>
                  <div className="mt-2">
                    <Badge status={labelStatus(b.transactionType || 'FOR_RENT')}>
                      {labelStatus(b.transactionType || 'FOR_RENT')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{b.address}</p>
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {b._count?.floors ?? 0} floor{(b._count?.floors ?? 0) === 1 ? '' : 's'} registered
                    {' · '}
                    {b._count?.units ?? 0} unit{(b._count?.units ?? 0) === 1 ? '' : 's'}
                    {b.notes ? ` · ${b.notes}` : ''}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Features:{' '}
                    {normalizePropertyTypes(b.propertyTypes)
                      .map(
                        (t) =>
                          BUILDING_PROPERTY_TYPE_OPTIONS.find((o) => o.value === t)?.label || t,
                      )
                      .join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEdit(b)}>
                    Edit
                  </Button>
                  <Link to={`/buildings/${b.id}`}>
                    <Button variant="secondary">
                      Manage floors
                      <MdChevronRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Building' : 'Add Building'}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"

              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={save}>
              {editing ? 'Save Changes' : 'Save Building'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Building 1"
          />
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="B1"
          />
          <Input
            label="Address"
            className="sm:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="Planned floors (optional)"
            type="number"
            min={0}
            value={form.floorsCount}
            onChange={(e) => setForm({ ...form, floorsCount: e.target.value })}
            hint="Target size only — registered floors come from Manage floors."
          />
          <Select
            label="Offer type"
            value={form.transactionType}
            onChange={(e) => setForm({ ...form, transactionType: e.target.value })}
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Input
            label="Notes"
            className="sm:col-span-2"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-[var(--text)]">
              Property types for this building
            </legend>
            <div className="flex flex-wrap gap-3">
              {BUILDING_PROPERTY_TYPE_OPTIONS.map((opt) => {
                const checked = (form.propertyTypes || []).includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePropertyType(opt.value)}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              SIHAM-style buildings should enable Apartments + Commercial only. Guest house
              buildings can also enable Guest Bookings.
            </p>
          </fieldset>
        </div>
      </Modal>
    </div>
  );
}
