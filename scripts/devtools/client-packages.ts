import { $ } from "bun";

export async function buildClientPackages(options?: {
  exclude: string[]
}) {
  let packageNames = [
    // Build api for the api client.
    "@superstreamer/api",
     // Build player for app.
    "@superstreamer/player",
  ];

  if (options?.exclude) {
    packageNames = packageNames.filter(name => !options.exclude.includes(name))
  }

  await Promise.all(packageNames.map(name => {
    return $`bun run --filter="${name}" build`;
  }));
}

