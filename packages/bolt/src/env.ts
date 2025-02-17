import { z } from "zod";

export const env = z
  .object({
    REDIS_URI: z.string(),
  })
  .parse(Bun.env);
