import { Router } from "express";
import { env } from "../../config/env";
import { getAdminClient } from "../../lib/supabase";
import { ok } from "../../common/utils/http";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res, next) => {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("properties").select("id", { count: "exact", head: true });

    ok(res, {
      status: "ok",
      service: "@real-state/api",
      schema: env.SUPABASE_DB_SCHEMA,
      database: error ? "degraded" : "connected",
      authRequired: env.REQUIRE_AUTH,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});
