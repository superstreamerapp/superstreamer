import { CloudflareKv } from "./cloudflare-kv";
import { RedisKv } from "./redis-kv";
import { env } from "../../env";

export interface Kv {
  set(key: string, value: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
}

export let kv: Kv;

// Map each KV adapter here to their corresponding constructor.
if (env.KV === "cloudflare-kv") {
  kv = new CloudflareKv();
} else if (env.KV === "redis") {
  kv = new RedisKv(env.REDIS_HOST, env.REDIS_PORT);
}
