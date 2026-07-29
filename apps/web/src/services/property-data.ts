import { createClient } from "../lib/supabase/server";
import type {
  AmenityRecord,
  BuildingRecord,
  CategoryRecord,
  FloorRecord,
  ImageRecord,
  UnitRecord,
} from "../components/property-management/property-management-data";

export type PropertyHydration = {
  buildings: BuildingRecord[];
  floors: FloorRecord[];
  units: UnitRecord[];
  categories: CategoryRecord[];
  amenities: AmenityRecord[];
  images: ImageRecord[];
  source: "supabase";
};

function mapAvailability(value: string): UnitRecord["availability"] {
  switch (value) {
    case "immediate":
      return "Immediate";
    case "in_7_days":
      return "In 7 Days";
    case "in_30_days":
      return "In 30 Days";
    default:
      return "Unavailable";
  }
}

function mapUnitStatus(value: string): UnitRecord["status"] {
  switch (value) {
    case "occupied":
      return "Occupied";
    case "available":
      return "Vacant";
    case "reserved":
      return "Reserved";
    case "maintenance":
      return "Maintenance";
    default:
      return "Vacant";
  }
}

function mapBuildingStatus(value: string): BuildingRecord["status"] {
  switch (value) {
    case "active":
      return "Active";
    case "inactive":
    case "archived":
      return "Archived";
    default:
      return "Active";
  }
}

function mapFloorStatus(value: string): FloorRecord["status"] {
  switch (value) {
    case "active":
      return "Active";
    case "partial":
      return "Partial";
    case "closed":
      return "Closed";
    default:
      return "Active";
  }
}

export async function fetchPropertyHydration(): Promise<PropertyHydration | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (
    !url ||
    !anonKey ||
    url.includes("YOUR_PROJECT_REF") ||
    anonKey.includes("YOUR_ANON_KEY") ||
    anonKey.includes("PASTE_YOUR_ANON")
  ) {
    return null;
  }

  try {
    const supabase = await createClient();

    const [propertiesRes, buildingsRes, floorsRes, unitsRes, categoriesRes, amenitiesRes, imagesRes] =
      await Promise.all([
        supabase.from("properties").select("id, name"),
        supabase.from("buildings").select("*").order("name"),
        supabase.from("floors").select("*").order("floor_number"),
        supabase.from("units").select("*").order("code"),
        supabase.from("unit_categories").select("*").order("name"),
        supabase.from("amenities").select("*").order("name"),
        supabase.from("media_assets").select("*").order("created_at", { ascending: false }),
      ]);

    if (buildingsRes.error || floorsRes.error || unitsRes.error) {
      console.error(
        "Property hydration failed",
        buildingsRes.error ?? floorsRes.error ?? unitsRes.error,
      );
      return null;
    }

    const propertyNames = new Map(
      (propertiesRes.data ?? []).map((property) => [property.id, property.name]),
    );
    const buildingNames = new Map(
      (buildingsRes.data ?? []).map((building) => [building.id, building.name]),
    );
    const floorNames = new Map(
      (floorsRes.data ?? []).map((floor) => [
        floor.id,
        floor.name ?? `Floor ${floor.floor_number}`,
      ]),
    );
    const categoryNames = new Map(
      (categoriesRes.data ?? []).map((category) => [category.id, category.name]),
    );
    const amenityCounts = new Map<string, number>();
    for (const unit of unitsRes.data ?? []) {
      amenityCounts.set(unit.id, 0);
    }

    const unitsByBuilding = new Map<string, number>();
    for (const unit of unitsRes.data ?? []) {
      unitsByBuilding.set(unit.building_id, (unitsByBuilding.get(unit.building_id) ?? 0) + 1);
    }

    const floorsByBuilding = new Map<string, number>();
    for (const floor of floorsRes.data ?? []) {
      floorsByBuilding.set(
        floor.building_id,
        (floorsByBuilding.get(floor.building_id) ?? 0) + 1,
      );
    }

    const unitsByFloor = new Map<string, number>();
    for (const unit of unitsRes.data ?? []) {
      unitsByFloor.set(unit.floor_id, (unitsByFloor.get(unit.floor_id) ?? 0) + 1);
    }

    const buildings: BuildingRecord[] = (buildingsRes.data ?? []).map((building) => ({
      id: building.id,
      name: building.name,
      property: propertyNames.get(building.property_id) ?? "Unknown property",
      manager: building.manager_name ?? "-",
      status: mapBuildingStatus(building.status),
      floors: String(floorsByBuilding.get(building.id) ?? building.number_of_floors ?? 0),
      units: String(unitsByBuilding.get(building.id) ?? 0),
    }));

    const floors: FloorRecord[] = (floorsRes.data ?? []).map((floor) => ({
      id: floor.id,
      building: buildingNames.get(floor.building_id) ?? "Unknown building",
      name: floor.name ?? `Floor ${floor.floor_number}`,
      level: String(floor.floor_number),
      status: mapFloorStatus(floor.status),
      units: String(unitsByFloor.get(floor.id) ?? 0),
    }));

    const units: UnitRecord[] = (unitsRes.data ?? []).map((unit) => ({
      id: unit.id,
      building: buildingNames.get(unit.building_id) ?? "Unknown building",
      floor: floorNames.get(unit.floor_id) ?? "-",
      code: unit.code,
      category: unit.category_id
        ? categoryNames.get(unit.category_id) ?? unit.unit_type
        : unit.unit_type,
      status: mapUnitStatus(unit.status),
      availability: mapAvailability(unit.availability),
      rate: unit.base_rate != null ? `$${Number(unit.base_rate).toLocaleString("en-US")}` : "-",
      images: "0",
      amenities: String(amenityCounts.get(unit.id) ?? 0),
    }));

    const categories: CategoryRecord[] = (categoriesRes.data ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      occupancyMode:
        category.occupancy_mode === "residential"
          ? "Residential"
          : category.occupancy_mode === "commercial"
            ? "Commercial"
            : "Short-Term",
      baseRate: `$${Number(category.base_rate).toLocaleString("en-US")}`,
      description: category.description ?? "",
      status: category.status === "active" ? "Active" : "Draft",
    }));

    const amenities: AmenityRecord[] = (amenitiesRes.data ?? []).map((amenity) => ({
      id: amenity.id,
      name: amenity.name,
      scope:
        amenity.scope === "building"
          ? "Building"
          : amenity.scope === "unit"
            ? "Unit"
            : "Shared",
      status: amenity.status === "active" ? "Active" : "Hidden",
      unitsAssigned: "0",
    }));

    const images: ImageRecord[] = (imagesRes.data ?? []).map((image) => {
      const categoryMap: Record<string, ImageRecord["category"]> = {
        exterior: "Exterior",
        interior: "Interior",
        amenity: "Amenity",
        floor_plan: "Floor Plan",
      };

      return {
        id: image.id,
        title: image.title,
        building: image.building_id
          ? buildingNames.get(image.building_id) ?? "-"
          : "-",
        unit: "-",
        category: categoryMap[image.category] ?? "Interior",
        status: image.status === "published" ? "Published" : "Draft",
        url: image.url,
      };
    });

    return {
      buildings,
      floors,
      units,
      categories,
      amenities,
      images,
      source: "supabase",
    };
  } catch (error) {
    console.error("Property hydration error", error);
    return null;
  }
}
