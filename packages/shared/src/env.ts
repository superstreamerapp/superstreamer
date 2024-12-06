import { config } from "dotenv";
import findConfig from "find-config";
import { z } from "zod";

// Get the environment from `NODE_ENV`, default to "development"
const environment = process.env.NODE_ENV || "development";

// Locate environment-specific config files
const baseConfigPath = findConfig("config.env");
const envConfigPath = findConfig(`config.env.${environment}`);

const configPath = envConfigPath || baseConfigPath;

// When we are running tests, we are not going to allow reading env variables
// from the config.env file as they might produce different results when running
// the tests locally.
const isTestEnv = process.env.NODE_ENV === "test";

if (configPath && !isTestEnv) {
  config({ path: configPath });
  console.log(`Loaded configuration from: ${configPath}`);
} else if (!isTestEnv) {
  console.warn(
    "No configuration file found, using existing environment variables.",
  );
}

type ParseEnvResolve<S extends z.ZodRawShape> = (parser: typeof z) => S;

export function parseEnv<S extends z.ZodRawShape>(resolve: ParseEnvResolve<S>) {
  const schema = z.object(resolve(z));
  return schema.parse(process.env);
}
