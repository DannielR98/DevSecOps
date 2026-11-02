import { build } from "esbuild";
import { readdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });

const entryPoints = readdirSync("src/handlers")
  .filter((file) => file.endsWith(".js"))
  .map((file) => `src/handlers/${file}`);

// The AWS SDK v3 is provided by the nodejs22.x Lambda runtime.
// ESM with splitting puts shared code (zod, bcryptjs, ...) in dist/chunks once instead of in every handler.
await build({
  entryPoints,
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  splitting: true,
  chunkNames: "chunks/[name]-[hash]",
  outExtension: { ".js": ".mjs" },
  banner: {
    js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
  },
  minify: false,
  external: ["@aws-sdk/*"],
});

console.log(`Built ${entryPoints.length} handlers into dist/`);
