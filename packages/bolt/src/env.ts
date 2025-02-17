import { z } from "zod";

export const env = z
  .object({
    REDIS_URL: z.string().default("redis://localhost:6379"),
  })
  .parse(Bun.env);
