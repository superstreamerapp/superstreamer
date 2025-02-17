import { $ } from "bun";

export async function buildClientPackages(options?: { exclude: string[] }) {
  let packageNames = [
    // Build player for app.
    "player",
  ];

  if (options?.exclude) {
    packageNames = packageNames.filter(
      (name) => !options.exclude.includes(name),
    );
  }

  for (const packageName of packageNames) {
    console.log(`👷 package [${packageName}] building`);
    await $`bun run --filter="@superstreamer/${packageName}" build`;
    console.log(`✅ package [${packageName}]`);
    if (packageName !== packageNames[packageNames.length - 1]) {
      console.log("");
    }
  }
}
