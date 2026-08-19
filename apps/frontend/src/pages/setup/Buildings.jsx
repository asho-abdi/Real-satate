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

const emptyForm = {
  name: '',
  code: '',
  address: '',
  floorsCount: 4,
  notes: '',
};

export default function Buildings() {
  const { globalSearch = '' } = useOutletContext() || {};
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
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim() || null,
        floorsCount: Number(form.floorsCount) || 0,
        notes: form.notes.trim() || null,
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
    } catch (err) {
      toast.error(err.message || 'Could not save building');
    }
  };

  return (
    <div>
      <PageHeader
        title="Buildings"
        subtitle="Register buildings, then floors and rooms. You choose shop, apartment, or guest per room."
        actions={
          <Button className="h-12 px-5 text-base" onClick={openCreate}>
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
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{b.address}</p>
                  <p className="mt-3 text-sm text-[var(--text)]">
                    {b.floorsCount} floors
                    {b._count ? (
                      <span className="text-[var(--text-muted)]">
                        {' '}
                        · {b._count.floors} registered · {b._count.units} rooms
                      </span>
                    ) : null}
                    {b.notes ? (
                      <span className="text-[var(--text-muted)]"> · {b.notes}</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="secondary" className="h-10 px-3 text-sm" onClick={() => openEdit(b)}>
                    Edit
                  </Button>
                  <Link to={`/buildings/${b.id}`}>
                    <Button variant="secondary" className="h-12 px-4">
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
              className="h-12 px-5"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button className="h-12 px-5 text-base" onClick={save}>
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
            label="Floors count"
            type="number"
            min={1}
            value={form.floorsCount}
            onChange={(e) => setForm({ ...form, floorsCount: e.target.value })}
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
