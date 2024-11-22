import { parseEnv } from "shared/env";

export const env = parseEnv((z) => ({
  PORT: z.coerce.number().default(52001),
  HOST: z.string().optional(),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),
  DATABASE_URI: z.string(),
  SUPER_SECRET: z.string(),
}));
