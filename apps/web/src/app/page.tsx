import { DashboardShell, DashboardSummaryStats } from "../components/dashboard/dashboard-shell";
import { dashboardKpis, type Kpi } from "../components/dashboard/dashboard-data";
import { fetchDashboardKpisServer } from "../services/dashboard";

function withLiveKpis(live: NonNullable<Awaited<ReturnType<typeof fetchDashboardKpisServer>>>): Kpi[] {
  const numberFormatter = new Intl.NumberFormat("en-US");

  return dashboardKpis.map((item) => {
    switch (item.label) {
      case "Total Buildings":
        return { ...item, value: numberFormatter.format(live.totalBuildings), note: "From Supabase buildings" };
      case "Total Units":
        return { ...item, value: numberFormatter.format(live.totalUnits), note: "From Supabase units" };
      case "Occupied Units":
        return { ...item, value: numberFormatter.format(live.occupiedUnits), note: "Units marked occupied" };
      case "Vacant Units":
        return { ...item, value: numberFormatter.format(live.vacantUnits), note: "Units marked available" };
      case "Residential Tenants":
        return { ...item, value: numberFormatter.format(live.residentialTenants), note: "Tenant records" };
      case "Commercial Tenants":
        return { ...item, value: numberFormatter.format(live.commercialTenants), note: "Business records" };
      case "Airbnb Bookings":
        return { ...item, value: numberFormatter.format(live.airbnbBookings), note: "Reservation records" };
      case "Maintenance Requests":
        return { ...item, value: numberFormatter.format(live.maintenanceRequests), note: "Open maintenance queue" };
      case "Occupancy Rate":
        return { ...item, value: `${live.occupancyRate}%`, note: "Occupied / total units" };
      default:
        return item;
    }
  });
}

export default async function HomePage() {
  const live = await fetchDashboardKpisServer();
  const kpis = live ? withLiveKpis(live) : dashboardKpis;
  const occupancyRateLabel = live ? `${live.occupancyRate}%` : "85.2%";

  return (
    <>
      <DashboardSummaryStats
        buildings={live?.totalBuildings}
        units={live?.totalUnits}
        maintenance={live?.maintenanceRequests}
        occupancyRateLabel={occupancyRateLabel}
      />
      <DashboardShell
        kpis={kpis}
        occupancyRateLabel={occupancyRateLabel}
        dataSourceLabel={live ? "Supabase Postgres" : "Demo data (configure .env.local)"}
      />
    </>
  );
}