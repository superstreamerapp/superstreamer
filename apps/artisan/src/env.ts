import { z } from "zod";

export const env = z
  .object({
    REDIS_URL: z.string(),
    S3_ENDPOINT: z.string(),
    S3_REGION: z.string(),
    S3_ACCESS_KEY: z.string(),
    S3_SECRET_KEY: z.string(),
    S3_BUCKET: z.string(),
  })
  .parse(Bun.env);
