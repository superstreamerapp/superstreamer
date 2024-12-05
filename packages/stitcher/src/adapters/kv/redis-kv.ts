import { createClient } from "redis";
import type { Kv } from ".";

const REDIS_PREFIX = "stitcher";

export class RedisKv implements Kv {
  private isConnected_ = false;

  private client_: ReturnType<typeof createClient>;

  constructor(host: string, port: number) {
    this.client_ = createClient({
      socket: { host, port },
    });
  }

  async set(key: string, value: string, ttl: number) {
    await this.init_();
    await this.client_.set(`${REDIS_PREFIX}:${key}`, value, {
      EX: ttl,
    });
  }

  async get(key: string) {
    await this.init_();
    return await this.client_.get(`${REDIS_PREFIX}:${key}`);
  }

  private async init_() {
    if (this.isConnected_) {
      return;
    }
    await this.client_.connect();
    this.isConnected_ = true;
  }
}
