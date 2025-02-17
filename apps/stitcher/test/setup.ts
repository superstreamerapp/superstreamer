import { mock, setSystemTime } from "bun:test";

mock.module("redis", () => ({
  createClient() {
    const items = new Map<string, string>();
    return {
      connect: () => Promise.resolve(),
      set: (key: string, value: string) => {
        items.set(key, value);
      },
      get: (key: string) => {
        return items.get(key) ?? null;
      },
    };
  },
}));

mock.module("vast-client", () => ({
  VASTClient: class {
    get = mock();
  },
}));

// The day my son was born!
setSystemTime(new Date(2021, 4, 2, 10, 12, 5, 250));

Bun.env["TZ"] = "UTC";

Bun.env["REDIS_URI"] = "redis://redis-host:0000";
Bun.env["PUBLIC_S3_ENDPOINT"] = "https://s3.com";
Bun.env["PUBLIC_STITCHER_ENDPOINT"] = "https://stitcher.com";
