import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Real Estate API listening on http://localhost:${env.PORT}`);
  console.log(`Health: http://localhost:${env.PORT}/api/v1/health`);
  console.log(`Schema: ${env.SUPABASE_DB_SCHEMA}`);
});
