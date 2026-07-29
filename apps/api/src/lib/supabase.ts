import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

// Schema is `real_estate` (custom), so we keep the client loosely typed.
type AppSupabaseClient = SupabaseClient<any, "real_estate", any>;

let adminClient: AppSupabaseClient | undefined;
let anonClient: AppSupabaseClient | undefined;

function createSchemaClient(apiKey: string, accessToken?: string): AppSupabaseClient {
  return createClient(env.SUPABASE_URL, apiKey, {
    db: { schema: env.SUPABASE_DB_SCHEMA },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as AppSupabaseClient;
}

export function getAdminClient(): AppSupabaseClient {
  if (!adminClient) {
    adminClient = createSchemaClient(env.SUPABASE_SERVICE_ROLE_KEY);
  }

  return adminClient;
}

export function getAnonClient(): AppSupabaseClient {
  if (!anonClient) {
    anonClient = createSchemaClient(env.SUPABASE_ANON_KEY);
  }

  return anonClient;
}

export function getClientForUser(accessToken?: string): AppSupabaseClient {
  if (!accessToken) {
    return getAdminClient();
  }

  return createSchemaClient(env.SUPABASE_ANON_KEY, accessToken);
}

export function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
