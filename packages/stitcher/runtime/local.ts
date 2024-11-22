import { createApp } from "../src";
import { env } from "../src/env";

const app = createApp({
  aot: true,
});

app.on("stop", () => {
  process.exit(0);
});

process
  .on("beforeExit", app.stop)
  .on("SIGINT", app.stop)
  .on("SIGTERM", app.stop);

app.listen(
  {
    port: env.PORT,
    hostname: env.HOST,
  },
  () => {
    console.log(`Started stitcher on port ${env.PORT}`);
  },
);
