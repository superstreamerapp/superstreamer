import { mock } from "bun:test";

mock.module("bullmq", () => ({
  Queue: class {},
  Worker: class {},
  WaitingChildrenError: class {},
}));

process.env = {
  NODE_ENV: "test",
  TZ: "UTC",
  S3_ENDPOINT: "s3-endpoint",
  S3_REGION: "s3-region",
  S3_ACCESS_KEY: "s3-access-key",
  S3_SECRET_KEY: "s3-secret-key",
  S3_BUCKET: "s3-bucket",
};
