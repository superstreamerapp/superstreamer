import { env } from "../../env";

interface KeyValue {
  set(key: string, value: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
}

export let kv: KeyValue;

// Map each KV adapter here to their corresponding import.
if (env.KV === "cloudflare-kv") {
  kv = await import("./cloudflare-kv");
} else if (env.KV === "redis") {
  kv = await import("./redis");
}
