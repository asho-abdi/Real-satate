import { DashboardShell, DashboardSummaryStats } from "../components/dashboard/dashboard-shell";

export default function HomePage() {
  return (
    <>
      <DashboardSummaryStats />
      <DashboardShell />
    </>
  );
}
