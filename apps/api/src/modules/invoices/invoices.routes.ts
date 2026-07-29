import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const invoicesRouter = Router();

const createSchema = z.object({
  invoice_number: z.string().min(1),
  lease_id: z.string().uuid().optional().nullable(),
  reservation_id: z.string().uuid().optional().nullable(),
  invoice_type: z.enum(["lease", "reservation", "adjustment", "deposit"]),
  status: z.enum(["draft", "issued", "partially_paid", "paid", "void"]).default("draft"),
  issue_date: z.string().min(1),
  due_date: z.string().min(1),
  currency_code: z.string().length(3).default("USD"),
  subtotal_amount: z.number().nonnegative(),
  tax_amount: z.number().nonnegative().default(0),
  total_amount: z.number().nonnegative(),
  balance_amount: z.number().nonnegative(),
});

invoicesRouter.get("/", async (req, res, next) => {
  try {
    let query = getAdminClient().from("invoices").select("*").order("due_date", { ascending: false });

    if (typeof req.query.status === "string") {
      query = query.eq("status", req.query.status);
    }
    if (typeof req.query.lease_id === "string") {
      query = query.eq("lease_id", req.query.lease_id);
    }
    if (typeof req.query.reservation_id === "string") {
      query = query.eq("reservation_id", req.query.reservation_id);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError(500, "Failed to list invoices", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient().from("invoices").insert(req.body).select("*").single();

    if (error) {
      throw new AppError(400, "Failed to create invoice", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("invoices")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update invoice", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
