import { env as getEnv, getRuntimeKey } from "hono/adapter";
import * as secureEncrypt from "secure-encrypt";
import { assert } from "shared/assert";
import { z } from "zod";
import type { KVNamespace } from "@cloudflare/workers-types";
import type { ApiClient } from "@superstreamer/api/client";
import type { Context } from "hono";

const runtimeKey = getRuntimeKey();

const envSchema = z.object({
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),
  PUBLIC_S3_ENDPOINT: z.string(),
  PUBLIC_STITCHER_ENDPOINT: z.string(),
  PUBLIC_API_ENDPOINT: z.string().optional(),
  SUPER_SECRET: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

interface Kv {
  set(key: string, value: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
}

interface Cipher {
  encrypt(value: string): string;
  decrypt(value: string): string;
}

export interface AppContext {
  env: Env;
  kv: Kv;
  api: ApiClient | null;
  cipher: Cipher;
}

export async function getAppContext(c: Context): Promise<AppContext> {
  const env = envSchema.parse(getEnv(c));

  const kv = await createKv(c, env);
  const api = await createApi(env);
  const cipher = createCipher(env);

  return {
    env,
    kv,
    api,
    cipher,
  };
}

async function createKv(
  c: Context<{
    Bindings: {
      kv?: KVNamespace;
    };
  }>,
  env: Env,
): Promise<Kv> {
  if (runtimeKey === "workerd") {
    return {
      async set(key, value, ttl) {
        assert(c.env.kv);
        await c.env.kv.put(key, value, {
          expirationTtl: ttl,
        });
      },
      async get(key) {
        assert(c.env.kv);
        return await c.env.kv.get(key);
      },
    };
  }

  const { createClient } = await import("redis");

  const client = createClient({
    socket: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
  });

  await client.connect();

  return {
    async set(key, value, ttl) {
      await client.set(`stitcher:${key}`, value, {
        EX: ttl,
      });
    },
    async get(key) {
      return await client.get(`stitcher:${key}`);
    },
  };
}

async function createApi(env: Env) {
  if (!env.PUBLIC_API_ENDPOINT) {
    return null;
  }

  const { createClient } = await import("@superstreamer/api/client");

  // TODO: We assert the secret here but use it for requests with the client later.
  assert(env.SUPER_SECRET);

  return createClient(env.PUBLIC_API_ENDPOINT);
}

function createCipher(env: Env): Cipher {
  const secret = env.SUPER_SECRET ?? "__UNSECURE__";
  return {
    encrypt(value) {
      return btoa(secureEncrypt.encrypt(value, secret));
    },
    decrypt(value) {
      return secureEncrypt.decrypt(atob(value), secret);
    },
  };
}
