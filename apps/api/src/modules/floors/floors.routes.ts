import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const floorsRouter = Router();

const createSchema = z.object({
  building_id: z.string().uuid(),
  floor_number: z.number().int(),
  name: z.string().optional().nullable(),
  status: z.enum(["active", "partial", "closed"]).default("active"),
});

floorsRouter.get("/", async (req, res, next) => {
  try {
    let query = getAdminClient().from("floors").select("*").order("floor_number");
    if (typeof req.query.building_id === "string") {
      query = query.eq("building_id", req.query.building_id);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError(500, "Failed to list floors", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

floorsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("floors").insert(req.body).select("*").single();
    if (error) {
      throw new AppError(400, "Failed to create floor", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

floorsRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("floors")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update floor", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

floorsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await getAdminClient().from("floors").delete().eq("id", paramId(req.params.id));
    if (error) {
      throw new AppError(400, "Failed to delete floor", error);
    }

    ok(res, { id: paramId(req.params.id), deleted: true });
  } catch (error) {
    next(error);
  }
});
