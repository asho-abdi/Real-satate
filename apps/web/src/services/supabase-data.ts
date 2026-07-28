import { createClient, isSupabaseConfigured } from "../lib/supabase/client";
import type { Database } from "../lib/supabase/database.types";

type BuildingRow = Database["public"]["Tables"]["buildings"]["Row"];
type FloorRow = Database["public"]["Tables"]["floors"]["Row"];
type UnitRow = Database["public"]["Tables"]["units"]["Row"];
type CategoryRow = Database["public"]["Tables"]["unit_categories"]["Row"];
type AmenityRow = Database["public"]["Tables"]["amenities"]["Row"];
type MediaRow = Database["public"]["Tables"]["media_assets"]["Row"];

export type PropertyModuleSnapshot = {
  buildings: Array<BuildingRow & { property_name?: string }>;
  floors: FloorRow[];
  units: UnitRow[];
  categories: CategoryRow[];
  amenities: AmenityRow[];
  images: MediaRow[];
};

export async function fetchPropertyModuleSnapshot(): Promise<PropertyModuleSnapshot | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClient();

  const [
    buildingsRes,
    floorsRes,
    unitsRes,
    categoriesRes,
    amenitiesRes,
    imagesRes,
    propertiesRes,
  ] = await Promise.all([
    supabase.from("buildings").select("*").order("name"),
    supabase.from("floors").select("*").order("floor_number"),
    supabase.from("units").select("*").order("code"),
    supabase.from("unit_categories").select("*").order("name"),
    supabase.from("amenities").select("*").order("name"),
    supabase.from("media_assets").select("*").order("created_at", { ascending: false }),
    supabase.from("properties").select("id, name"),
  ]);

  if (buildingsRes.error) {
    console.error("Supabase buildings error:", buildingsRes.error.message);
    return null;
  }

  const propertyMap = new Map(
    (propertiesRes.data ?? []).map((property) => [property.id, property.name]),
  );

  return {
    buildings: (buildingsRes.data ?? []).map((building) => ({
      ...building,
      property_name: propertyMap.get(building.property_id),
    })),
    floors: floorsRes.data ?? [],
    units: unitsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    amenities: amenitiesRes.data ?? [],
    images: imagesRes.data ?? [],
  };
}

export async function fetchDashboardKpis() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClient();

  const [buildings, units, tenants, businesses, reservations, maintenance] =
    await Promise.all([
      supabase.from("buildings").select("id", { count: "exact", head: true }),
      supabase.from("units").select("id, status", { count: "exact" }),
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase.from("businesses").select("id", { count: "exact", head: true }),
      supabase.from("reservations").select("id", { count: "exact", head: true }),
      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "assigned", "in_progress"]),
    ]);

  const unitRows = units.data ?? [];
  const occupied = unitRows.filter((unit) => unit.status === "occupied").length;
  const vacant = unitRows.filter((unit) => unit.status === "available").length;
  const totalUnits = units.count ?? unitRows.length;
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
  };
}

export async function fetchResidentialUnits() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("units")
    .select("*, buildings(name), unit_categories(name)")
    .eq("occupancy_mode", "residential")
    .order("code");

  if (error) {
    console.error("Supabase residential units error:", error.message);
    return null;
  }

  return data;
}

export async function fetchCommercialUnits() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("units")
    .select("*, buildings(name), unit_categories(name)")
    .eq("occupancy_mode", "commercial")
    .order("code");

  if (error) {
    console.error("Supabase commercial units error:", error.message);
    return null;
  }

  return data;
}

export async function fetchReservations() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*, guests(first_name, last_name, email, phone), units(code, buildings(name))")
    .order("check_in_date", { ascending: false });

  if (error) {
    console.error("Supabase reservations error:", error.message);
    return null;
  }

  return data;
}