import {
  dashboardKpis,
  occupancySeries,
  portfolioHighlights,
  quickActions,
  recentActivities,
  revenueSeries,
  type ActivityItem,
  type Kpi,
} from "./dashboard-data";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

export function DashboardShell() {
  const maxOccupancy = Math.max(
    ...occupancySeries.map((point) => point.occupied + point.vacant),
  );
  const maxRevenue = Math.max(...revenueSeries.map((point) => point.value));

  return (
    <main className="dashboard-page">
      <section className="hero-card">
        <div>
          <span className="eyebrow">Real Estate Management Platform</span>
          <h1>Portfolio Intelligence Dashboard</h1>
          <p className="hero-copy">
            Monitor occupancy, revenue, bookings, tenant activity, and
            maintenance operations from one executive control center.
          </p>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span>Live Occupancy</span>
            <strong>85.2%</strong>
            <small>+2.1% vs last month</small>
          </div>
          <div className="hero-stat">
            <span>Revenue Run Rate</span>
            <strong>$5.74M</strong>
            <small>Rolling annualized view</small>
          </div>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Key performance indicators">
        {dashboardKpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </section>

      <section className="analytics-grid">
        <article className="panel panel-wide">
          <div className="panel-header">
            <div>
              <span className="panel-label">Occupancy Trends</span>
              <h2>Occupied vs vacant units</h2>
            </div>
            <span className="panel-chip">Last 7 months</span>
          </div>

          <div className="bar-chart" role="img" aria-label="Occupancy trend bar chart">
            {occupancySeries.map((point) => {
              const occupiedHeight = (point.occupied / maxOccupancy) * 100;
              const vacantHeight = (point.vacant / maxOccupancy) * 100;

              return (
                <div key={point.month} className="bar-group">
                  <div className="bar-stack">
                    <div
                      className="bar bar-vacant"
                      style={{ height: `${vacantHeight}%` }}
                    />
                    <div
                      className="bar bar-occupied"
                      style={{ height: `${occupiedHeight}%` }}
                    />
                  </div>
                  <span>{point.month}</span>
                </div>
              );
            })}
          </div>

          <div className="legend-row">
            <Legend colorClass="legend-occupied" label="Occupied units" />
            <Legend colorClass="legend-vacant" label="Vacant units" />
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Revenue Trend</span>
              <h2>Monthly revenue growth</h2>
            </div>
            <span className="panel-chip">Year to date</span>
          </div>

          <RevenueChart maxRevenue={maxRevenue} />
          <div className="chart-footer">
            <strong>{currencyFormatter.format(revenueSeries.at(-1)?.value ?? 0)}</strong>
            <span>Current month booked revenue</span>
          </div>
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Quick Actions</span>
              <h2>Fast operational shortcuts</h2>
            </div>
          </div>

          <div className="quick-actions-grid">
            {quickActions.map((action) => (
              <button key={action.title} className={`quick-action ${action.accent}`}>
                <span className="quick-action-title">{action.title}</span>
                <span className="quick-action-copy">{action.description}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Portfolio Highlights</span>
              <h2>Snapshot insights</h2>
            </div>
          </div>

          <div className="highlight-list">
            {portfolioHighlights.map((highlight) => (
              <div key={highlight.label} className="highlight-row">
                <span>{highlight.label}</span>
                <strong>{highlight.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="activity-panel panel">
        <div className="panel-header">
          <div>
            <span className="panel-label">Recent Activity</span>
            <h2>Operational events across the portfolio</h2>
          </div>
          <span className="panel-chip">Live feed</span>
        </div>

        <div className="activity-list">
          {recentActivities.map((activity) => (
            <ActivityCard key={activity.id} item={activity} />
          ))}
        </div>
      </section>
    </main>
  );
}

function KpiCard({ item }: { item: Kpi }) {
  return (
    <article className="kpi-card">
      <div className="kpi-header">
        <span>{item.label}</span>
        <Badge trend={item.trend}>{item.change}</Badge>
      </div>
      <strong>{item.value}</strong>
      <p>{item.note}</p>
    </article>
  );
}

function Badge({
  trend,
  children,
}: {
  trend: "up" | "down" | "neutral";
  children: string;
}) {
  return <span className={`badge badge-${trend}`}>{children}</span>;
}

function Legend({
  colorClass,
  label,
}: {
  colorClass: string;
  label: string;
}) {
  return (
    <div className="legend-item">
      <span className={`legend-dot ${colorClass}`} />
      <span>{label}</span>
    </div>
  );
}

function RevenueChart({ maxRevenue }: { maxRevenue: number }) {
  const points = revenueSeries.map((point, index) => {
    const x = (index / (revenueSeries.length - 1)) * 100;
    const y = 100 - (point.value / maxRevenue) * 100;
    return `${x},${y}`;
  });

  return (
    <div className="line-chart-wrapper">
      <svg
        className="line-chart"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Monthly revenue line chart"
      >
        <defs>
          <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.45)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0.02)" />
          </linearGradient>
        </defs>
        <polyline
          fill="url(#revenueFill)"
          stroke="none"
          points={`0,100 ${points.join(" ")} 100,100`}
        />
        <polyline fill="none" stroke="currentColor" strokeWidth="2.6" points={points.join(" ")} />
        {revenueSeries.map((point, index) => {
          const x = (index / (revenueSeries.length - 1)) * 100;
          const y = 100 - (point.value / maxRevenue) * 100;

          return <circle key={point.month} cx={x} cy={y} r="1.8" fill="currentColor" />;
        })}
      </svg>

      <div className="chart-axis">
        {revenueSeries.map((point) => (
          <div key={point.month} className="axis-point">
            <span>{point.month}</span>
            <strong>{currencyFormatter.format(point.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  return (
    <article className="activity-card">
      <div className={`activity-dot activity-${item.category}`} />
      <div className="activity-content">
        <div className="activity-heading">
          <strong>{item.title}</strong>
          <span>{item.time}</span>
        </div>
        <p>{item.description}</p>
      </div>
    </article>
  );
}

export function DashboardSummaryStats() {
  return (
    <div className="summary-strip" aria-label="Portfolio summary values">
      <div>
        <span>Buildings</span>
        <strong>{numberFormatter.format(128)}</strong>
      </div>
      <div>
        <span>Units</span>
        <strong>{numberFormatter.format(4860)}</strong>
      </div>
      <div>
        <span>Open Maintenance</span>
        <strong>{numberFormatter.format(93)}</strong>
      </div>
      <div>
        <span>Occupancy</span>
        <strong>85.2%</strong>
      </div>
    </div>
  );
}
