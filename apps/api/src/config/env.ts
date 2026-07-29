import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .optional()
    .transform((value) => {
      if (!value || value.startsWith("YOUR_")) {
        return undefined;
      }
      return value;
    }),
  SUPABASE_DB_SCHEMA: z.string().default("real_estate"),
  REQUIRE_AUTH: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid API environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error(
    "Missing or invalid env vars. Copy apps/api/.env.example to apps/api/.env and fill Supabase keys.",
  );
}

if (!parsed.data.SUPABASE_SERVICE_ROLE_KEY && parsed.data.NODE_ENV !== "production") {
  console.warn(
    "[api] SUPABASE_SERVICE_ROLE_KEY missing — falling back to anon key (RLS may block writes).",
  );
}

if (!parsed.data.SUPABASE_SERVICE_ROLE_KEY && parsed.data.NODE_ENV === "production") {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in production.");
}

export const env = {
  ...parsed.data,
  SUPABASE_SERVICE_ROLE_KEY:
    parsed.data.SUPABASE_SERVICE_ROLE_KEY ?? parsed.data.SUPABASE_ANON_KEY,
};
