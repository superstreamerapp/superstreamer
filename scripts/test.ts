import { $ } from "bun";
import { buildClientPackages } from "./devtools/client-packages";

await buildClientPackages({
  // We don't need the player package as we do not use it in tests.
  exclude: ["@superstreamer/player"]
});

await $`bun run --filter="*" test`;
