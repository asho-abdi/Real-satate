import EmptyState from '../components/ui/EmptyState.jsx';
import { MdConstruction as MdConstructionIcon } from 'react-icons/md';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { PROJECT_STATUSES } from '../utils/constants.js';
import { formatCurrency, formatDate, cn } from '../utils/format.js';
import { rentalApi } from '../services/rentalApi.js';
import { labelStatus } from '../utils/labels.js';
import ProgressCard from '../components/realty/ProgressCard.jsx';

const emptyProject = {
  name: '',
  description: '',
  startDate: '',
  expectedEndDate: '',
  status: 'PLANNING',
  budget: '',
  notes: '',
  templates: 'suppliers,workers,inventory,expenses,worker_payments',
};

function ProjectList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyProject);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [progressRows, setProgressRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [list, sum, progress] = await Promise.all([
        rentalApi.listWorkProjects(params),
        rentalApi.getWorkProjectSummary(),
        rentalApi.listWorkProgress().catch(() => []),
      ]);
      setRows(list || []);
      setSummary(sum);
      setProgressRows(progress || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setSaving(true);
    try {
      const created = await rentalApi.createWorkProject({
        ...form,
        budget: form.budget === '' ? null : Number(form.budget),
      });
      toast.success('Project created');
      setOpen(false);
      navigate(`/work-progress/${created.id}`);
    } catch (err) {
      toast.error(err.message || 'Could not create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Working Progress"
        subtitle="Private project workspace for construction and other RJK REALTY business activities — separate from property maintenance."
        actions={<Button onClick={() => { setForm(emptyProject); setOpen(true); }}>New Project</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-xs uppercase text-[var(--text-muted)]">Planning</p><p className="mt-2 text-2xl font-bold">{summary?.planning ?? 0}</p></Card>
        <Card><p className="text-xs uppercase text-[var(--text-muted)]">In progress</p><p className="mt-2 text-2xl font-bold">{summary?.inProgress ?? 0}</p></Card>
        <Card><p className="text-xs uppercase text-[var(--text-muted)]">On hold</p><p className="mt-2 text-2xl font-bold">{summary?.onHold ?? 0}</p></Card>
        <Card><p className="text-xs uppercase text-[var(--text-muted)]">Completed</p><p className="mt-2 text-2xl font-bold">{summary?.completed ?? 0}</p></Card>
      </div>

      {progressRows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {progressRows.slice(0, 6).map((item) => (
            <ProgressCard
              key={item.id}
              title={item.title}
              subtitle={[item.building?.name, item.unit?.roomNumber].filter(Boolean).join(' · ')}
              status={labelStatus(item.status)}
              percent={item.progressPercent}
              meta={item.updatedAt ? `Updated ${formatDate(item.updatedAt)}` : item.notes || ''}
            />
          ))}
        </div>
      ) : null}

      <Card>
        <div className="mb-4">
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All projects</option>
            {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : rows.length === 0 ? (
          <EmptyState compact className="border-0" icon={MdConstructionIcon} title="No projects yet" description="Create a construction or business project to get started." />
        ) : (
          <div className="space-y-3">
            {rows.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/work-progress/${p.id}`)}
                className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] p-4 text-left transition hover:bg-[var(--surface-2)]"
              >
                <div>
                  <h3 className="font-semibold text-[var(--text)]">{p.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {p.building?.name ? `${p.building.name} · ` : ''}
                    {p._count?.sections ?? 0} sections
                    {p.budget != null ? ` · Budget ${formatCurrency(p.budget)}` : ''}
                  </p>
                </div>
                <Badge status={labelStatus(p.status)}>{labelStatus(p.status)}</Badge>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="New Working Progress Project"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input className="sm:col-span-2" label="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="New Building Construction" />
          <Input className="sm:col-span-2" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="Expected completion" type="date" value={form.expectedEndDate} onChange={(e) => setForm({ ...form, expectedEndDate: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Input label="Budget" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          <Input className="sm:col-span-2" label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <p className="sm:col-span-2 text-xs text-[var(--text-muted)]">
            Default sections: Suppliers, Workers, Inventory, Expenses, Worker Payments. You can add custom sections later.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function ProjectWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({});
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [sectionTemplate, setSectionTemplate] = useState('suppliers');
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, tpls] = await Promise.all([
        rentalApi.getWorkProject(id),
        rentalApi.getWorkSectionTemplates(),
      ]);
      setProject(p);
      setTemplates(tpls || []);
      if (!activeSectionId && p.sections?.[0]) setActiveSectionId(p.sections[0].id);
    } catch (err) {
      toast.error(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id, activeSectionId]);

  useEffect(() => {
    load();
  }, [id]);

  const section = project?.sections?.find((s) => s.id === activeSectionId) || project?.sections?.[0];

  const openAddRecord = () => {
    const blank = {};
    (section?.fieldSchema || []).forEach((f) => {
      blank[f.key] = '';
    });
    setRecordForm(blank);
    setRecordOpen(true);
  };

  const saveRecord = async () => {
    if (!section) return;
    setSaving(true);
    try {
      await rentalApi.addWorkRecord(section.id, recordForm);
      toast.success('Record added');
      setRecordOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not save record');
    } finally {
      setSaving(false);
    }
  };

  const addSection = async () => {
    if (!sectionName.trim() && !sectionTemplate) {
      toast.error('Section name or template required');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.addWorkSection(project.id, {
        name: sectionName.trim() || undefined,
        template: sectionTemplate || undefined,
        ...(!sectionTemplate
          ? {
              fieldSchema: [
                { key: 'name', label: 'Name', type: 'text' },
                { key: 'amount', label: 'Amount', type: 'number' },
                { key: 'date', label: 'Date', type: 'date' },
                { key: 'notes', label: 'Notes', type: 'textarea' },
              ],
            }
          : {}),
      });
      toast.success('Section added');
      setSectionOpen(false);
      setSectionName('');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not add section');
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async () => {
    if (!confirm) return;
    try {
      await rentalApi.deleteWorkRecord(confirm.id);
      toast.success('Record removed');
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not delete');
    }
  };

  if (loading || !project) {
    return (
      <div className="flex justify-center py-24"><Spinner /></div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        subtitle={project.description || 'Working Progress project workspace'}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/work-progress')}>
              All projects
            </Button>
            <Button onClick={() => setSectionOpen(true)}>Add section</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge status={labelStatus(project.status)}>{labelStatus(project.status)}</Badge>
        {project.startDate ? <span className="text-sm text-[var(--text-muted)]">Start {formatDate(project.startDate)}</span> : null}
        {project.expectedEndDate ? <span className="text-sm text-[var(--text-muted)]">Due {formatDate(project.expectedEndDate)}</span> : null}
        {project.budget != null ? <span className="text-sm text-[var(--text-muted)]">Budget {formatCurrency(project.budget)}</span> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(project.sections || []).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSectionId(s.id)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition',
              (section?.id === s.id)
                ? 'bg-brand-700 text-white'
                : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]',
            )}
          >
            {s.name} ({s.records?.length || 0})
          </button>
        ))}
      </div>

      <Card
        title={section?.name || 'Section'}
        action={<Button onClick={openAddRecord}>Add record</Button>}
      >
        {!section ? (
          <p className="text-sm text-[var(--text-muted)]">No sections yet.</p>
        ) : (section.records || []).length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">No records in this section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  {(section.fieldSchema || []).map((f) => (
                    <th key={f.key} className="px-3 py-2">{f.label}</th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {section.records.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)]/60">
                    {(section.fieldSchema || []).map((f) => (
                      <td key={f.key} className="px-3 py-3">
                        {f.type === 'number' && r.data?.[f.key] !== '' && r.data?.[f.key] != null
                          ? formatCurrency(r.data[f.key])
                          : String(r.data?.[f.key] ?? '—')}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right">
                      <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => setConfirm(r)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={recordOpen}
        onClose={() => !saving && setRecordOpen(false)}
        title={`Add · ${section?.name || 'Record'}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRecordOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveRecord} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {(section?.fieldSchema || []).map((f) =>
            f.type === 'textarea' ? (
              <div key={f.key} className="sm:col-span-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[var(--text)]">{f.label}</span>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    value={recordForm[f.key] || ''}
                    onChange={(e) => setRecordForm({ ...recordForm, [f.key]: e.target.value })}
                  />
                </label>
              </div>
            ) : (
              <Input
                key={f.key}
                label={f.label}
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={recordForm[f.key] || ''}
                onChange={(e) => setRecordForm({ ...recordForm, [f.key]: e.target.value })}
              />
            ),
          )}
        </div>
      </Modal>

      <Modal
        open={sectionOpen}
        onClose={() => !saving && setSectionOpen(false)}
        title="Add custom section"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSectionOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={addSection} disabled={saving}>{saving ? 'Adding…' : 'Add section'}</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Select label="From template" value={sectionTemplate} onChange={(e) => setSectionTemplate(e.target.value)}>
            <option value="">Custom / blank name only with template fields</option>
            {templates.map((t) => (
              <option key={t.key} value={t.key}>{t.name}</option>
            ))}
          </Select>
          <Input label="Section name (optional override)" value={sectionName} onChange={(e) => setSectionName(e.target.value)} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete record?"
        message="Remove this record from the section?"
        confirmLabel="Delete"
        danger
        onConfirm={removeRecord}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

export default function WorkProgressPage() {
  const { id } = useParams();
  if (id) return <ProjectWorkspace />;
  return <ProjectList />;
}
