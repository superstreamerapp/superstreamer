import { parseEnv } from "shared/env";

const env = parseEnv((z) => ({
  // config.env
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
}));

export const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};
