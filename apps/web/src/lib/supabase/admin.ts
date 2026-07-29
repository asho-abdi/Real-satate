import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Server-only admin client. Never import into client components. */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient<Database>(url, serviceKey, {
    db: { schema: "real_estate" },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}