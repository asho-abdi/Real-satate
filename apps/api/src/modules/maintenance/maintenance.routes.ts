import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const maintenanceRouter = Router();

const createSchema = z.object({
  request_number: z.string().min(1),
  property_id: z.string().uuid().optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
  floor_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z
    .enum(["open", "assigned", "in_progress", "on_hold", "resolved", "closed", "cancelled"])
    .default("open"),
});

maintenanceRouter.get("/", async (req, res, next) => {
  try {
    let query = getAdminClient()
      .from("maintenance_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (typeof req.query.status === "string") {
      query = query.eq("status", req.query.status);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError(500, "Failed to list maintenance requests", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

maintenanceRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("maintenance_requests")
      .insert(req.body)
      .select("*")
      .single();

    if (error) {
      throw new AppError(400, "Failed to create maintenance request", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

maintenanceRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("maintenance_requests")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update maintenance request", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
