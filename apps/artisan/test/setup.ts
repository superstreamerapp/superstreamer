import { mock } from "bun:test";

mock.module("bullmq", () => ({
  Queue: class {},
  Worker: class {},
  WaitingChildrenError: class {},
}));

Bun.env["TZ"] = "UTC";

Bun.env["REDIS_URI"] = "redis://redis-host:0000";
Bun.env["S3_ENDPOINT"] = "s3-endpoint";
Bun.env["S3_REGION"] = "s3-region";
Bun.env["S3_ACCESS_KEY"] = "s3-access-key";
Bun.env["S3_SECRET_KEY"] = "s3-secret-key";
Bun.env["S3_BUCKET"] = "s3-bucket";
