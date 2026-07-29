import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const tenantsRouter = Router();

const createSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(["prospect", "active", "inactive", "blacklisted"]).default("prospect"),
});

tenantsRouter.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("tenants").select("*").order("last_name");
    if (error) {
      throw new AppError(500, "Failed to list tenants", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

tenantsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("tenants").insert(req.body).select("*").single();
    if (error) {
      throw new AppError(400, "Failed to create tenant", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

tenantsRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("tenants")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update tenant", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
