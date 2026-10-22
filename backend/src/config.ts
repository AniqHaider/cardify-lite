import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4100),
  HOST: z.string().default("127.0.0.1"),
  // Optional: with no database URL the server keeps settings in memory (local demo).
  DATABASE_URL: z.string().min(1).optional(),
  ADMIN_API_KEY: z
    .string()
    .min(8, "ADMIN_API_KEY must be set (min 8 chars) — refusing to start with an open admin API"),
  ADMIN_ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  SDK_DIR: z.string().default("../sdk/dist"),
});

export interface AppConfig {
  port: number;
  host: string;
  databaseUrl: string | undefined;
  adminApiKey: string;
  adminOrigins: string[];
  sdkDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.parse(env);
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    databaseUrl: parsed.DATABASE_URL,
    adminApiKey: parsed.ADMIN_API_KEY,
    adminOrigins: parsed.ADMIN_ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    sdkDir: parsed.SDK_DIR,
  };
}
