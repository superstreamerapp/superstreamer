import { createClient } from "redis";
import { env } from "../../env";

const REDIS_PREFIX = "stitcher";

const client = createClient({
  socket: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
});

await client.connect();

export async function set(key: string, value: string, ttl: number) {
  await client.set(`${REDIS_PREFIX}:${key}`, value, {
    EX: ttl,
  });
}

export async function get(key: string) {
  return await client.get(`${REDIS_PREFIX}:${key}`);
}
