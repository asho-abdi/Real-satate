import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { formatCurrency, cn } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';
import { labelStatus, labelUsage } from '../../utils/labels.js';

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
];

function MiniTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
            {headers.map((h) => (
              <th key={h} className="pb-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)]/50">
              {row.map((cell, j) => (
                <td key={j} className="py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-[var(--text-muted)]">No data for this filter.</p>
      ) : null}
    </div>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [exporting, setExporting] = useState(false);

  const filterParams = useMemo(() => {
    const params = { period };
    if (period === 'custom') {
      if (from) params.from = from;
      if (to) params.to = to;
    }
    if (buildingId) params.buildingId = buildingId;
    if (floorId) params.floorId = floorId;
    return params;
  }, [period, from, to, buildingId, floorId]);

  const buildingFloors = useMemo(
    () => floors.filter((f) => !buildingId || f.buildingId === buildingId),
    [floors, buildingId],
  );

  const loadMeta = useCallback(async () => {
    try {
      const [b, f] = await Promise.all([
        rentalApi.listBuildings(),
        rentalApi.listFloors(),
      ]);
      setBuildings(b);
      setFloors(f);
    } catch (err) {
      toast.error(err.message || 'Failed to load buildings');
    }
  }, []);

  const loadReport = useCallback(async () => {
    if (period === 'custom' && (!from || !to)) {
      toast.error('Choose from and to dates for custom report');
      return;
    }
    setLoading(true);
    try {
      setReport(await rentalApi.getReportSummary(filterParams));
    } catch (err) {
      toast.error(err.message || 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [filterParams, period, from, to]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (period === 'custom' && (!from || !to)) return;
    loadReport();
  }, [loadReport, period, from, to]);

  const onBuildingChange = (id) => {
    setBuildingId(id);
    setFloorId('');
  };

  const downloadCsv = () => {
    if (!report) return;
    const lines = [];
    lines.push(['Section', 'Type', 'Name', 'Building', 'Floor', 'Room', 'Period', 'Amount', 'Status'].join(','));
    for (const r of report.revenueLines || []) {
      lines.push(
        [
          'Revenue',
          r.type,
          r.name,
          r.building,
          r.floor,
          r.roomNumber,
          r.period,
          r.amount,
          r.status,
        ]
          .map(escapeCsv)
          .join(','),
      );
    }
    for (const r of report.rooms || []) {
      lines.push(
        [
          'Occupancy',
          r.usage,
          r.roomNumber,
          r.building,
          r.floor,
          r.roomNumber,
          r.status,
          r.monthlyRent,
          r.status,
        ]
          .map(escapeCsv)
          .join(','),
      );
    }
    for (const r of report.outstanding || []) {
      lines.push(
        [
          'Outstanding',
          'balance',
          r.name,
          r.building,
          '',
          r.roomNumber,
          r.month,
          r.balance,
          r.status,
        ]
          .map(escapeCsv)
          .join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(
      blob,
      `report-${report.period.from}-to-${report.period.to}.csv`,
    );
    toast.success('CSV downloaded');
  };

  const downloadFile = async (format) => {
    if (period === 'custom' && (!from || !to)) {
      toast.error('Choose from and to dates first');
      return;
    }
    setExporting(true);
    try {
      const response = await rentalApi.downloadReport({ ...filterParams, format });
      const blob = new Blob([response.data], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const fromKey = report?.period?.from || from || 'report';
      const toKey = report?.period?.to || to || fromKey;
      downloadBlob(blob, `report-${fromKey}-to-${toKey}.${ext}`);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setExporting(false);
    }
  };

  const s = report?.summary;

  return (
    <div className="reports-page">
      <PageHeader
        title="Reports"
        subtitle="RJK REALTY reports — filter by period, building, or floor, then print or download."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              variant="secondary"
              className="h-11 px-4"
              onClick={() => window.print()}
              disabled={!report}
            >
              Print
            </Button>
            <Button
              variant="secondary"
              className="h-11 px-4"
              onClick={downloadCsv}
              disabled={!report}
            >
              CSV
            </Button>
            <Button
              variant="secondary"
              className="h-11 px-4"
              onClick={() => downloadFile('xlsx')}
              disabled={!report || exporting}
            >
              Excel
            </Button>
            <Button
              className="h-11 px-4"
              onClick={() => downloadFile('pdf')}
              disabled={!report || exporting}
            >
              PDF
            </Button>
          </div>
        }
      />

      <Card className="mb-6 print:hidden">
        <div className="mb-4 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={cn(
                'h-11 rounded-xl px-4 text-sm font-medium transition',
                period === p.id
                  ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-ink-950'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] ring-1 ring-[var(--border)]',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {period === 'custom' ? (
            <>
              <Input
                label="From"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <Input
                label="To"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </>
          ) : null}
          <Select
            label="Building"
            value={buildingId}
            onChange={(e) => onBuildingChange(e.target.value)}
          >
            <option value="">All buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            label="Floor"
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
            disabled={!buildingId && buildingFloors.length === 0}
          >
            <option value="">All floors</option>
            {buildingFloors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {!buildingId && f.building?.name ? ` · ${f.building.name}` : ''}
              </option>
            ))}
          </Select>
        </div>

        {period === 'custom' ? (
          <Button className="mt-4 h-11 px-5" onClick={loadReport}>
            Generate custom report
          </Button>
        ) : null}
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : !report ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            Choose filters and generate a report.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="print-only mb-4 hidden print:block">
            <h1 className="text-xl font-semibold">RJK REALTY Report</h1>
            <p className="text-sm">
              {report.scope.label} · {report.period.label}
            </p>
          </div>

          <p className="text-sm text-[var(--text-muted)] print:hidden">
            Showing <strong className="text-[var(--text)]">{report.scope.label}</strong>
            {' · '}
            {report.period.label}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Gross revenue</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(s?.revenueTotal || 0)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Rent {formatCurrency(s?.rentCollected || 0)} · Guests{' '}
                {formatCurrency(s?.guestCollected || 0)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Maintenance cost</p>
              <p className="mt-1 text-2xl font-semibold text-rose-600">
                −{formatCurrency(s?.maintenanceCost || 0)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {s?.maintenanceCount || 0} record{(s?.maintenanceCount || 0) === 1 ? '' : 's'}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Net revenue</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(s?.netRevenue ?? (s?.revenueTotal || 0) - (s?.maintenanceCost || 0))}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Gross − maintenance</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Rooms occupied</p>
              <p className="mt-1 text-2xl font-semibold">
                {s?.occupied || 0}
                <span className="text-base font-normal text-[var(--text-muted)]">
                  {' '}
                  / {s?.totalRooms || 0}
                </span>
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Available {s?.available || 0} · Reserved {s?.reserved || 0}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Occupancy rate</p>
              <p className="mt-1 text-2xl font-semibold">{s?.occupancyRate || 0}%</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-muted)]">Outstanding</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(s?.outstanding || 0)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Bookings {s?.bookingsCount || 0} · Check-outs {s?.checkOuts || 0}
              </p>
            </Card>
          </div>

          <Card title="Occupancy by floor" className="print:break-inside-avoid">
            <MiniTable
              headers={['Building', 'Floor', 'Total', 'Available', 'Occupied', 'Reserved']}
              rows={(report.occupancyByFloor || []).map((f) => [
                f.buildingName,
                f.floorName,
                f.total,
                f.available,
                f.occupied,
                f.reserved,
              ])}
            />
          </Card>

          <Card title="Rooms in scope" className="print:break-inside-avoid">
            <MiniTable
              headers={['Building', 'Floor', 'Room', 'Usage', 'Status', 'Monthly rent']}
              rows={(report.rooms || []).map((r) => [
                r.building,
                r.floor,
                r.roomNumber,
                labelUsage(r.usage),
                labelStatus(r.status),
                formatCurrency(r.monthlyRent),
              ])}
            />
          </Card>

          <Card title="Revenue details" className="print:break-inside-avoid">
            <MiniTable
              headers={['Type', 'Name', 'Building', 'Floor', 'Room', 'Period', 'Amount', 'Status']}
              rows={(report.revenueLines || []).map((r) => [
                r.type,
                r.name,
                r.building,
                r.floor,
                r.roomNumber,
                r.period,
                formatCurrency(r.amount),
                labelStatus(r.status),
              ])}
            />
          </Card>

          <Card title="Outstanding payments" className="print:break-inside-avoid">
            <MiniTable
              headers={['Name', 'Building', 'Room', 'Month', 'Balance', 'Status']}
              rows={(report.outstanding || []).map((r) => [
                r.name,
                r.building,
                r.roomNumber,
                r.month,
                formatCurrency(r.balance),
                labelStatus(r.status),
              ])}
            />
          </Card>

          <Card title="Guest bookings in period" className="print:break-inside-avoid">
            <MiniTable
              headers={['Code', 'Guest', 'Building', 'Floor', 'Room', 'Dates', 'Total', 'Status']}
              rows={(report.bookings || []).map((b) => [
                b.code,
                b.fullName,
                b.building,
                b.floor,
                b.roomNumber,
                `${b.checkIn} → ${b.checkOut}`,
                formatCurrency(b.totalAmount),
                labelStatus(b.status),
              ])}
            />
          </Card>
        </div>
      )}

      <style>{`
        @media print {
          .print\\:hidden, .print\\:hidden * { display: none !important; }
          .print-only { display: block !important; }
          aside, nav, header, .sidebar { display: none !important; }
          main, .reports-page { width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
