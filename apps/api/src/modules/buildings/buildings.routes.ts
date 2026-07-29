import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const buildingsRouter = Router();

const createSchema = z.object({
  property_id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  number_of_floors: z.number().int().nonnegative().optional().nullable(),
  manager_name: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

buildingsRouter.get("/", async (req, res, next) => {
  try {
    let query = getAdminClient().from("buildings").select("*").order("name");
    if (typeof req.query.property_id === "string") {
      query = query.eq("property_id", req.query.property_id);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError(500, "Failed to list buildings", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

buildingsRouter.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("buildings")
      .select("*")
      .eq("id", paramId(req.params.id))
      .maybeSingle();

    if (error) {
      throw new AppError(500, "Failed to fetch building", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

buildingsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("buildings")
      .insert(req.body)
      .select("*")
      .single();

    if (error) {
      throw new AppError(400, "Failed to create building", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

buildingsRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("buildings")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update building", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

buildingsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await getAdminClient().from("buildings").delete().eq("id", paramId(req.params.id));
    if (error) {
      throw new AppError(400, "Failed to delete building", error);
    }

    ok(res, { id: paramId(req.params.id), deleted: true });
  } catch (error) {
    next(error);
  }
});
