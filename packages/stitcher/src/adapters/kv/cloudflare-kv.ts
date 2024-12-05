import type { Kv } from ".";
import type { KVNamespace } from "@cloudflare/workers-types";

export class CloudflareKv implements Kv {
  async set(key: string, value: string, ttl: number) {
    const kv = this.getKv_();
    await kv.put(key, value, {
      expirationTtl: ttl,
    });
  }

  async get(key: string) {
    const kv = this.getKv_();
    return await kv.get(key);
  }

  private getKv_() {
    // Make sure wrangler.toml has a binding named "kv".
    if ("kv" in process.env) {
      // @ts-expect-error Proper cast
      return process.env.kv as KVNamespace;
    }
    throw new Error("Cloudflare KV is not found in process.env");
  }
}
