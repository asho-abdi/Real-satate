import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const businessesRouter = Router();

const createSchema = z.object({
  legal_name: z.string().min(1),
  trade_name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  business_category: z.string().optional().nullable(),
  status: z.enum(["prospect", "active", "inactive"]).default("prospect"),
});

businessesRouter.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("businesses").select("*").order("legal_name");
    if (error) {
      throw new AppError(500, "Failed to list businesses", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

businessesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("businesses")
      .insert(req.body)
      .select("*")
      .single();

    if (error) {
      throw new AppError(400, "Failed to create business", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

businessesRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("businesses")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update business", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
