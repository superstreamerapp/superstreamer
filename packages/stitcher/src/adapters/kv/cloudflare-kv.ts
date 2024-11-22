import type { KVNamespace } from "@cloudflare/workers-types";

// Make sure wrangler.toml has a binding named "kv".
const kv = process.env["kv"] as unknown as KVNamespace;

if (!kv) {
  throw new ReferenceError(
    'No kv found for Cloudflare, make sure you have "kv"' +
      " set as binding in wrangler.toml.",
  );
}

export async function set(key: string, value: string, ttl: number) {
  await kv.put(key, value, {
    expirationTtl: ttl,
  });
}

export async function get(key: string) {
  return await kv.get(key);
}
