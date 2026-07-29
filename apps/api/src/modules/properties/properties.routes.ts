import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const propertiesRouter = Router();

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  property_type: z.enum(["residential", "commercial", "mixed_use", "hospitality"]),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  address_line_1: z.string().min(1),
  address_line_2: z.string().optional().nullable(),
  city: z.string().min(1),
  state_region: z.string().optional().nullable(),
  country: z.string().min(1),
  postal_code: z.string().optional().nullable(),
  timezone: z.string().default("UTC"),
});

const updateSchema = createSchema.partial();

propertiesRouter.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("properties")
      .select("*")
      .order("name");

    if (error) {
      throw new AppError(500, "Failed to list properties", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

propertiesRouter.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("properties")
      .select("*")
      .eq("id", paramId(req.params.id))
      .maybeSingle();

    if (error) {
      throw new AppError(500, "Failed to fetch property", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

propertiesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("properties")
      .insert(req.body)
      .select("*")
      .single();

    if (error) {
      throw new AppError(400, "Failed to create property", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

propertiesRouter.patch("/:id", validate(updateSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("properties")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update property", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

propertiesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("properties")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to archive property", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
