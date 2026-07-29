import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const unitsRouter = Router();

const createSchema = z.object({
  building_id: z.string().uuid(),
  floor_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  code: z.string().min(1),
  name: z.string().optional().nullable(),
  unit_type: z.string().default("apartment"),
  occupancy_mode: z.enum(["residential", "commercial", "short_term", "hybrid"]),
  status: z
    .enum(["available", "occupied", "reserved", "maintenance", "inactive"])
    .default("available"),
  availability: z
    .enum(["immediate", "in_7_days", "in_30_days", "unavailable"])
    .default("immediate"),
  bedrooms: z.number().int().nonnegative().optional().nullable(),
  bathrooms: z.number().nonnegative().optional().nullable(),
  area_sqm: z.number().nonnegative().optional().nullable(),
  base_rate: z.number().nonnegative().optional().nullable(),
  cleaning_status: z
    .enum(["clean", "dirty", "cleaning_in_progress", "inspected"])
    .default("clean"),
});

unitsRouter.get("/", async (req, res, next) => {
  try {
    let query = getAdminClient().from("units").select("*").order("code");

    if (typeof req.query.building_id === "string") {
      query = query.eq("building_id", req.query.building_id);
    }
    if (typeof req.query.occupancy_mode === "string") {
      query = query.eq("occupancy_mode", req.query.occupancy_mode);
    }
    if (typeof req.query.status === "string") {
      query = query.eq("status", req.query.status);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError(500, "Failed to list units", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

unitsRouter.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("units")
      .select("*")
      .eq("id", paramId(req.params.id))
      .maybeSingle();

    if (error) {
      throw new AppError(500, "Failed to fetch unit", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

unitsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("units").insert(req.body).select("*").single();
    if (error) {
      throw new AppError(400, "Failed to create unit", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

unitsRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("units")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update unit", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

unitsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("units")
      .update({ deleted_at: new Date().toISOString(), status: "inactive" })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to archive unit", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
