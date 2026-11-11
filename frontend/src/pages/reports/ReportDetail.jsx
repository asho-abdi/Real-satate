import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MdArrowBack, MdPictureAsPdf, MdPrint, MdTableView } from 'react-icons/md';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import {
  remOccupancySeries,
  remRevenueSeries,
  remInvoices,
  remPayments,
  remBuildings,
  remResidentialTenants,
  remCommercialTenants,
  remMaintenance,
  remUnits,
} from '../../services/remsData.js';
import { downloadBlob, formatCurrency, formatPercent, toCsv } from '../../utils/format.js';

const REPORT_META = {
  occupancy: {
    title: 'Occupancy Report',
    subtitle: 'Utilization trends by occupancy mode.',
  },
  financial: {
    title: 'Financial Report',
    subtitle: 'Invoice and payment status overview.',
  },
  revenue: {
    title: 'Revenue Report',
    subtitle: 'Residential, commercial, and Airbnb revenue.',
  },
  building: {
    title: 'Building Report',
    subtitle: 'Inventory and occupancy by building.',
  },
  tenant: {
    title: 'Tenant Report',
    subtitle: 'Active residential and commercial tenants.',
  },
  maintenance: {
    title: 'Maintenance Report',
    subtitle: 'Work orders by priority and status.',
  },
};

const chartTooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--text)',
};

export default function ReportDetail() {
  const { type } = useParams();
  const navigate = useNavigate();
  const meta = REPORT_META[type];
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    building: '',
    unit: '',
    status: '',
  });

  useEffect(() => {
    if (!meta) return undefined;
    const t = setTimeout(() => {
      if (type === 'occupancy') {
        setChartData(remOccupancySeries);
        setTableRows(
          remUnits.map((u) => ({
            id: u.id,
            code: u.code,
            building: u.building,
            occupancyMode: u.occupancyMode,
            status: u.status,
          })),
        );
      } else if (type === 'financial') {
        const byStatus = remInvoices.reduce((acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + row.amount;
          return acc;
        }, {});
        setChartData(Object.entries(byStatus).map(([name, value]) => ({ name, value })));
        setTableRows([
          ...remInvoices.map((i) => ({ ...i, payerName: i.payer })),
          ...remPayments.map((p) => ({ ...p, type: 'Payment', payerName: p.payer })),
        ]);
      } else if (type === 'revenue') {
        setChartData(remRevenueSeries);
        setTableRows(
          remRevenueSeries.map((row, i) => ({
            id: `rev-${i}`,
            ...row,
            total: row.residential + row.commercial + row.airbnb,
          })),
        );
      } else if (type === 'building') {
        setChartData(
          remBuildings.map((b) => ({ name: b.code, occupancy: b.occupancy || 0, units: b.units })),
        );
        setTableRows(remBuildings);
      } else if (type === 'tenant') {
        const rows = [
          ...remResidentialTenants.map((t) => ({ ...t, segment: 'Residential' })),
          ...remCommercialTenants.map((t) => ({
            ...t,
            name: t.company,
            segment: 'Commercial',
          })),
        ];
        setTableRows(rows);
        const byStatus = rows.reduce((acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + 1;
          return acc;
        }, {});
        setChartData(Object.entries(byStatus).map(([name, value]) => ({ name, value })));
      } else if (type === 'maintenance') {
        setTableRows(remMaintenance);
        const byPriority = remMaintenance.reduce((acc, row) => {
          acc[row.priority] = (acc[row.priority] || 0) + 1;
          return acc;
        }, {});
        setChartData(Object.entries(byPriority).map(([name, value]) => ({ name, value })));
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [type, meta]);

  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      if (filters.building && row.building && row.building !== filters.building) return false;
      if (filters.unit) {
        const code = row.code || row.unit || '';
        if (!String(code).toLowerCase().includes(filters.unit.toLowerCase())) return false;
      }
      if (filters.status && row.status && row.status !== filters.status) return false;
      return true;
    });
  }, [tableRows, filters]);

  const columns = useMemo(() => getColumns(type), [type]);
  const buildings = useMemo(() => [...new Set(remBuildings.map((b) => b.name))], []);
  const statuses = useMemo(
    () => [...new Set(tableRows.map((r) => r.status).filter(Boolean))],
    [tableRows],
  );

  function handleExportPdf() {
    window.print();
    toast.success('Print / PDF dialog opened');
  }

  function handleExportExcel() {
    const exportRows = filteredRows.map((row) => {
      const copy = { ...row };
      delete copy.avatar;
      return copy;
    });
    downloadBlob(`${type}-report.csv`, toCsv(exportRows), 'text/csv;charset=utf-8');
    toast.success('Excel/CSV exported');
  }

  if (!meta) {
    return (
      <EmptyState
        title="Unknown report type"
        description={`“${type}” is not a valid report.`}
        action={
          <Button onClick={() => navigate('/reports')}>
            <MdArrowBack /> Back to reports
          </Button>
        }
      />
    );
  }

  if (loading) return <Spinner label="Loading report..." />;

  return (
    <div className="print:bg-white">
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        breadcrumbs={[
          { label: 'Operations' },
          { label: 'Reports', to: '/reports' },
          { label: meta.title },
        ]}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" onClick={() => navigate('/reports')}>
              <MdArrowBack /> Back
            </Button>
            <Button variant="secondary" onClick={handleExportPdf}>
              <MdPictureAsPdf /> Export PDF
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>
              <MdTableView /> Export Excel
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                window.print();
                toast.success('Print dialog opened');
              }}
            >
              <MdPrint /> Print
            </Button>
          </div>
        }
      />

      <Card title="Filters" className="mb-6 print:hidden">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Date from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
          <Input
            label="Date to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
          <Select
            label="Building"
            value={filters.building}
            onChange={(e) => setFilters({ ...filters, building: e.target.value })}
          >
            <option value="">All buildings</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Input
            label="Unit"
            placeholder="Code / unit"
            value={filters.unit}
            onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card title="Overview" className="mb-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(type, chartData)}
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        title="Data"
        action={
          <Link
            to="/reports"
            className="text-sm text-brand-700 hover:underline print:hidden dark:text-brand-300"
          >
            All reports
          </Link>
        }
      >
        <DataTable columns={columns} rows={filteredRows} emptyTitle="No report data" />
      </Card>
    </div>
  );
}

function renderChart(type, data) {
  if (type === 'occupancy') {
    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
        <YAxis domain={[60, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => `${v}%`} />
        <Legend />
        <Line type="monotone" dataKey="rate" name="Occupancy" stroke="#2E6299" strokeWidth={2} dot={false} />
      </LineChart>
    );
  }

  if (type === 'revenue') {
    return (
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revReportFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E6299" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2E6299" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1e3).toFixed(0)}k`}
        />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => formatCurrency(v)} />
        <Legend />
        <Area type="monotone" dataKey="residential" stroke="#2E6299" fill="url(#revReportFill)" strokeWidth={2} />
        <Area type="monotone" dataKey="commercial" stroke="#CF8C00" fill="transparent" strokeWidth={2} />
        <Area type="monotone" dataKey="airbnb" stroke="#1A9470" fill="transparent" strokeWidth={2} />
      </AreaChart>
    );
  }

  if (type === 'building') {
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend />
        <Bar dataKey="occupancy" name="Occupancy %" fill="#2E6299" radius={[4, 4, 0, 0]} />
        <Bar dataKey="units" name="Units" fill="#CF8C00" radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  }

  return (
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
      <Tooltip
        contentStyle={chartTooltipStyle}
        formatter={(v) => (type === 'financial' ? formatCurrency(v) : v)}
      />
      <Bar dataKey="value" fill="#2E6299" radius={[4, 4, 0, 0]} />
    </BarChart>
  );
}

function getColumns(type) {
  if (type === 'occupancy') {
    return [
      { key: 'code', label: 'Unit' },
      { key: 'building', label: 'Building' },
      { key: 'occupancyMode', label: 'Mode' },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <Badge status={row.status}>{row.status}</Badge>,
      },
    ];
  }
  if (type === 'financial') {
    return [
      { key: 'code', label: 'Code' },
      { key: 'payer', label: 'Party' },
      {
        key: 'amount',
        label: 'Amount',
        render: (row) => formatCurrency(row.amount),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <Badge status={row.status}>{row.status}</Badge>,
      },
    ];
  }
  if (type === 'revenue') {
    return [
      { key: 'month', label: 'Month' },
      {
        key: 'residential',
        label: 'Residential',
        render: (row) => formatCurrency(row.residential),
      },
      {
        key: 'commercial',
        label: 'Commercial',
        render: (row) => formatCurrency(row.commercial),
      },
      {
        key: 'airbnb',
        label: 'Airbnb',
        render: (row) => formatCurrency(row.airbnb),
      },
      {
        key: 'total',
        label: 'Total',
        render: (row) => formatCurrency(row.total),
      },
    ];
  }
  if (type === 'building') {
    return [
      { key: 'name', label: 'Building' },
      { key: 'city', label: 'City' },
      { key: 'units', label: 'Units' },
      {
        key: 'occupancy',
        label: 'Occupancy',
        render: (row) => formatPercent(row.occupancy || 0),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <Badge status={row.status}>{row.status}</Badge>,
      },
    ];
  }
  if (type === 'tenant') {
    return [
      { key: 'name', label: 'Name' },
      { key: 'segment', label: 'Segment' },
      { key: 'unit', label: 'Unit' },
      {
        key: 'rent',
        label: 'Rent',
        render: (row) => formatCurrency(row.rent),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <Badge status={row.status}>{row.status}</Badge>,
      },
    ];
  }
  return [
    { key: 'title', label: 'Issue' },
    { key: 'unit', label: 'Unit' },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => <Badge status={row.priority}>{row.priority}</Badge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status}>{row.status}</Badge>,
    },
    { key: 'assignee', label: 'Assignee' },
  ];
}
