import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatDate } from '../../utils/format.js';

export default function PriceHistoryChart({ priceHistory = [] }) {
  if (!priceHistory.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
        No price history available
      </div>
    );
  }

  const data = priceHistory.map((row) => ({
    ...row,
    label: formatDate(row.date),
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              color: 'var(--text)',
            }}
            formatter={(value) => formatCurrency(value, 'AED')}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#0f766e"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#0f766e' }}
            activeDot={{ r: 6 }}
            name="Price"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
