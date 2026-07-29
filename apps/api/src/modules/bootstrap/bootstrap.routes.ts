import { Router } from "express";
import { getAdminClient } from "../../lib/supabase";
import { AppError } from "../../common/errors/app-error";
import { ok } from "../../common/utils/http";

export const bootstrapRouter = Router();

bootstrapRouter.get("/property-management", async (_req, res, next) => {
  try {
    const supabase = getAdminClient();

    const [properties, buildings, floors, units, categories, amenities, images] =
      await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("buildings").select("*").order("name"),
        supabase.from("floors").select("*").order("floor_number"),
        supabase.from("units").select("*").order("code"),
        supabase.from("unit_categories").select("*").order("name"),
        supabase.from("amenities").select("*").order("name"),
        supabase.from("media_assets").select("*").order("created_at", { ascending: false }),
      ]);

    if (buildings.error || floors.error || units.error) {
      throw new AppError(
        500,
        "Failed to load property management bootstrap data",
        buildings.error ?? floors.error ?? units.error,
      );
    }

    ok(res, {
      properties: properties.data ?? [],
      buildings: buildings.data ?? [],
      floors: floors.data ?? [],
      units: units.data ?? [],
      categories: categories.data ?? [],
      amenities: amenities.data ?? [],
      images: images.data ?? [],
    });
  } catch (error) {
    next(error);
  }
});
