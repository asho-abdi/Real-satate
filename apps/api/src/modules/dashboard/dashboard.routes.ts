import { Router } from "express";
import { getAdminClient } from "../../lib/supabase";
import { AppError } from "../../common/errors/app-error";
import { ok } from "../../common/utils/http";

export const dashboardRouter = Router();

dashboardRouter.get("/kpis", async (_req, res, next) => {
  try {
    const supabase = getAdminClient();

    const [buildings, units, tenants, businesses, reservations, maintenance] = await Promise.all([
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
      throw new AppError(500, "Failed to load dashboard KPIs", buildings.error ?? units.error);
    }

    const unitRows = units.data ?? [];
    const occupiedUnits = unitRows.filter((unit) => unit.status === "occupied").length;
    const vacantUnits = unitRows.filter((unit) => unit.status === "available").length;
    const totalUnits = unitRows.length;
    const occupancyRate =
      totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0;

    ok(res, {
      totalBuildings: buildings.count ?? 0,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      residentialTenants: tenants.count ?? 0,
      commercialTenants: businesses.count ?? 0,
      airbnbBookings: reservations.count ?? 0,
      maintenanceRequests: maintenance.count ?? 0,
      occupancyRate,
    });
  } catch (error) {
    next(error);
  }
});
