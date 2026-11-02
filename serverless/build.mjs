import { build } from "esbuild";
import { readdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });

const entryPoints = readdirSync("src/handlers")
  .filter((file) => file.endsWith(".js"))
  .map((file) => `src/handlers/${file}`);

// The AWS SDK v3 is provided by the nodejs22.x Lambda runtime.
await build({
  entryPoints,
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  minify: true,
  external: ["@aws-sdk/*"],
});

console.log(`Built ${entryPoints.length} handlers into dist/`);
