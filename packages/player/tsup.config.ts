import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
  },
  splitting: false,
  sourcemap: true,
  clean: false,
  dts: true,
  format: "esm",
  noExternal: ["shared", "tseep"],
});
