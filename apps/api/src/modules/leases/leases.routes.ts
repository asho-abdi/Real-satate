import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const leasesRouter = Router();

const createSchema = z.object({
  lease_number: z.string().min(1),
  unit_id: z.string().uuid(),
  lease_type: z.enum(["residential", "commercial"]),
  business_id: z.string().uuid().optional().nullable(),
  status: z.string().default("draft"),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  notice_date: z.string().optional().nullable(),
  currency_code: z.string().length(3).default("USD"),
  deposit_amount: z.number().nonnegative().default(0),
  rent_amount: z.number().nonnegative().default(0),
  billing_frequency: z.enum(["monthly", "quarterly", "yearly", "custom"]).default("monthly"),
  contract_duration: z.string().optional().nullable(),
  lease_agreement: z.string().optional().nullable(),
});

leasesRouter.get("/", async (req, res, next) => {
  try {
    let query = getAdminClient().from("leases").select("*").order("created_at", { ascending: false });
    if (typeof req.query.lease_type === "string") {
      query = query.eq("lease_type", req.query.lease_type);
    }
    if (typeof req.query.status === "string") {
      query = query.eq("status", req.query.status);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError(500, "Failed to list leases", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

leasesRouter.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("leases")
      .select("*")
      .eq("id", paramId(req.params.id))
      .maybeSingle();

    if (error) {
      throw new AppError(500, "Failed to fetch lease", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

leasesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("leases").insert(req.body).select("*").single();
    if (error) {
      throw new AppError(400, "Failed to create lease", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

leasesRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("leases")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update lease", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
