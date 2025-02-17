import { $ } from "bun";
import { buildClientPackages } from "./misc/helpers";

console.log("✨ Build packages\n");

await buildClientPackages();

console.log("\n✨ Build apps\n");

const apps = ["api", "app", "artisan", "stitcher"];

for (const app of apps) {
  console.log(`👷 app [${app}] building`);
  await $`bun run --filter="@superstreamer/${app}" build`;
  console.log(`✅ app [${app}]`);
  if (app !== apps[apps.length - 1]) {
    console.log("");
  }
}

console.log("\n🎉 all done!");
