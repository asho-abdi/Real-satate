import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
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

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    try {
      await rentalApi.createBuilding({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim() || null,
        floorsCount: Number(form.floorsCount) || 0,
        notes: form.notes.trim() || null,
      });
      setOpen(false);
      setForm(emptyForm);
      toast.success('Building added');
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
          <Button className="h-12 px-5 text-base" onClick={() => setOpen(true)}>
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
          {buildings.map((b) => (
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
                <Link to={`/buildings/${b.id}`}>
                  <Button variant="secondary" className="h-12 px-4">
                    Manage floors
                    <MdChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Building"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-12 px-5" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="h-12 px-5 text-base" onClick={save}>
              Save Building
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
