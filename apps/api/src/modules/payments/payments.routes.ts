import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const paymentsRouter = Router();

const createSchema = z.object({
  payment_number: z.string().min(1),
  payer_type: z.enum(["tenant", "business", "guest"]),
  payer_id: z.string().uuid(),
  payment_method: z.enum(["cash", "card", "bank_transfer", "mobile_money", "wallet", "other"]),
  status: z.enum(["pending", "completed", "failed", "reversed", "refunded"]).default("pending"),
  currency_code: z.string().length(3).default("USD"),
  amount: z.number().nonnegative(),
  paid_at: z.string().optional().nullable(),
  received_by: z.string().uuid().optional().nullable(),
  reference_number: z.string().optional().nullable(),
});

paymentsRouter.get("/", async (req, res, next) => {
  try {
    let query = getAdminClient().from("payments").select("*").order("created_at", { ascending: false });

    if (typeof req.query.status === "string") {
      query = query.eq("status", req.query.status);
    }
    if (typeof req.query.payer_type === "string") {
      query = query.eq("payer_type", req.query.payer_type);
    }
    if (typeof req.query.payer_id === "string") {
      query = query.eq("payer_id", req.query.payer_id);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError(500, "Failed to list payments", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("payments").insert(req.body).select("*").single();

    if (error) {
      throw new AppError(400, "Failed to create payment", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

paymentsRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("payments")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update payment", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
