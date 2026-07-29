import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { authOptional, authRequired } from "./common/middleware/auth";
import { errorHandler, notFoundHandler } from "./common/middleware/error-handler";
import { healthRouter } from "./modules/health/health.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { propertiesRouter } from "./modules/properties/properties.routes";
import { buildingsRouter } from "./modules/buildings/buildings.routes";
import { floorsRouter } from "./modules/floors/floors.routes";
import { unitsRouter } from "./modules/units/units.routes";
import { leasesRouter } from "./modules/leases/leases.routes";
import { reservationsRouter } from "./modules/reservations/reservations.routes";
import { tenantsRouter } from "./modules/tenants/tenants.routes";
import { businessesRouter } from "./modules/businesses/businesses.routes";
import { guestsRouter } from "./modules/guests/guests.routes";
import { maintenanceRouter } from "./modules/maintenance/maintenance.routes";
import { invoicesRouter } from "./modules/invoices/invoices.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { bootstrapRouter } from "./modules/bootstrap/bootstrap.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(authOptional);

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      data: {
        name: "Real Estate Management API",
        version: "0.1.0",
        docs: "/api/v1/health",
      },
    });
  });

  const api = express.Router();
  api.use(authRequired);

  api.use("/health", healthRouter);
  api.use("/dashboard", dashboardRouter);
  api.use("/properties", propertiesRouter);
  api.use("/buildings", buildingsRouter);
  api.use("/floors", floorsRouter);
  api.use("/units", unitsRouter);
  api.use("/leases", leasesRouter);
  api.use("/reservations", reservationsRouter);
  api.use("/tenants", tenantsRouter);
  api.use("/businesses", businessesRouter);
  api.use("/guests", guestsRouter);
  api.use("/maintenance", maintenanceRouter);
  api.use("/invoices", invoicesRouter);
  api.use("/payments", paymentsRouter);
  api.use("/bootstrap", bootstrapRouter);

  app.use("/api/v1", api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
