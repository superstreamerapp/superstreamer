import { $ } from "bun";
import { buildClientPackages } from "./misc/helpers";

console.log("✨ Build packages\n");

await buildClientPackages();

console.log("\n✨ Starting dev\n");

await $`bun run --filter="@superstreamer/*" dev`;
