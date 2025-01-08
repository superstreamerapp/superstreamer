import { $ } from "bun";
import { buildClientPackages } from "./devtools/client-packages";

await buildClientPackages();

await Promise.all([
  $`bun run --filter="@superstreamer/app" build`,
  $`bun run --filter="@superstreamer/artisan" build`,
  $`bun run --filter="@superstreamer/stitcher" build`,
]);
