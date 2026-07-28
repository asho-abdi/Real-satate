import { createClient } from "../lib/supabase/server";

export async function fetchDashboardKpisServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !url ||
    !anonKey ||
    url.includes("YOUR_PROJECT_REF") ||
    anonKey.includes("YOUR_ANON_KEY")
  ) {
    return null;
  }

  try {
    const supabase = await createClient();

    const [buildings, units, tenants, businesses, reservations, maintenance] =
      await Promise.all([
        supabase.from("buildings").select("id", { count: "exact", head: true }),
        supabase.from("units").select("id, status"),
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        supabase.from("businesses").select("id", { count: "exact", head: true }),
        supabase.from("reservations").select("id", { count: "exact", head: true }),
        supabase
          .from("maintenance_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "assigned", "in_progress"]),
      ]);

    if (buildings.error || units.error) {
      console.error("Dashboard KPI query failed", buildings.error ?? units.error);
      return null;
    }

    const unitRows = units.data ?? [];
    const occupied = unitRows.filter((unit) => unit.status === "occupied").length;
    const vacant = unitRows.filter((unit) => unit.status === "available").length;
    const totalUnits = unitRows.length;
    const occupancyRate =
      totalUnits > 0 ? Math.round((occupied / totalUnits) * 1000) / 10 : 0;

    return {
      totalBuildings: buildings.count ?? 0,
      totalUnits,
      occupiedUnits: occupied,
      vacantUnits: vacant,
      residentialTenants: tenants.count ?? 0,
      commercialTenants: businesses.count ?? 0,
      airbnbBookings: reservations.count ?? 0,
      maintenanceRequests: maintenance.count ?? 0,
      occupancyRate,
      source: "supabase" as const,
    };
  } catch (error) {
    console.error("Dashboard KPI fetch error", error);
    return null;
  }
}