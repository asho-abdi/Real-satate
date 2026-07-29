import { Router } from "express";
import { z } from "zod";
import { getAdminClient, paramId } from "../../lib/supabase";
import { AppError, assertFound } from "../../common/errors/app-error";
import { ok, validate } from "../../common/utils/http";

export const reservationsRouter = Router();

const createSchema = z.object({
  reservation_number: z.string().min(1),
  unit_id: z.string().uuid(),
  guest_id: z.string().uuid(),
  status: z
    .enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"])
    .default("pending"),
  check_in_date: z.string().min(1),
  check_out_date: z.string().min(1),
  adults_count: z.number().int().positive().default(1),
  children_count: z.number().int().nonnegative().default(0),
  currency_code: z.string().length(3).default("USD"),
  base_amount: z.number().nonnegative().default(0),
  total_amount: z.number().nonnegative().default(0),
  cleaning_status: z
    .enum(["clean", "dirty", "cleaning_in_progress", "inspected"])
    .default("clean"),
});

reservationsRouter.get("/", async (req, res, next) => {
  try {
    let query = getAdminClient()
      .from("reservations")
      .select("*")
      .order("check_in_date", { ascending: false });

    if (typeof req.query.status === "string") {
      query = query.eq("status", req.query.status);
    }
    if (typeof req.query.unit_id === "string") {
      query = query.eq("unit_id", req.query.unit_id);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError(500, "Failed to list reservations", error);
    }

    ok(res, data ?? []);
  } catch (error) {
    next(error);
  }
});

reservationsRouter.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("reservations")
      .insert(req.body)
      .select("*")
      .single();

    if (error) {
      throw new AppError(400, "Failed to create reservation", error);
    }

    ok(res, data, 201);
  } catch (error) {
    next(error);
  }
});

reservationsRouter.patch("/:id", validate(createSchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("reservations")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to update reservation", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

reservationsRouter.post("/:id/check-in", async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("reservations")
      .update({
        status: "checked_in",
        cleaning_status: "inspected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to check in reservation", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});

reservationsRouter.post("/:id/check-out", async (req, res, next) => {
  try {
    const { data, error } = await getAdminClient()
      .from("reservations")
      .update({
        status: "checked_out",
        cleaning_status: "dirty",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paramId(req.params.id))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new AppError(400, "Failed to check out reservation", error);
    }

    ok(res, assertFound(data));
  } catch (error) {
    next(error);
  }
});
