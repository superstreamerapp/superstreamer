import { parseEnv } from "shared/env";

export const env = parseEnv((z) => ({
  PORT: z.coerce.number().default(52002),
  HOST: z.string().optional(),

  KV: z.enum(["redis", "cloudflare-kv"]).default("redis"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),

  PUBLIC_S3_ENDPOINT: z.string(),
  PUBLIC_STITCHER_ENDPOINT: z.string(),
  PUBLIC_API_ENDPOINT: z.string(),

  // Secret is optional, if we don't provide it, we won't be able to
  // call API requests but one might not need to do that.
  SUPER_SECRET: z.string().optional(),
}));
