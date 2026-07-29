import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const guestsRouter = Router();

const createSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "restricted"]).default("active"),
});

guestsRouter.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("guests").select("*").order("last_name");
    if (error) {
      throw new AppError(500, "Failed to list guests", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

guestsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("guests").insert(req.body).select("*").single();
    if (error) {
      throw new AppError(400, "Failed to create guest", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

guestsRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("guests")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update guest", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
