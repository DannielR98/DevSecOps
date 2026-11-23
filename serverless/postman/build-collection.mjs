import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve collection files relative to this script so it works from any cwd.
const postmanDir = dirname(fileURLToPath(import.meta.url));
const partsDir = join(postmanDir, "requests");
const outputPath = process.argv[2];

// Newman needs one collection file, so fail clearly if no temporary output path is supplied.
if (!outputPath) {
  throw new Error("Provide the output path for the assembled Postman collection.");
}

// The manifest holds shared metadata; request files hold ordered functional sections.
const manifest = JSON.parse(
  await readFile(join(postmanDir, "serverless.collection.json"), "utf8"),
);
const partNames = [
  "owner-authentication.json",
  "groups.json",
  "member-authentication.json",
  "group-membership.json",
  "quizzes.json",
  "access-control.json",
];

// Load sections in scenario order and reject malformed files before writing output.
const folders = await Promise.all(
  partNames.map(async (partName) => {
    const folder = JSON.parse(await readFile(join(partsDir, partName), "utf8"));
    if (typeof folder.name !== "string" || !Array.isArray(folder.item)) {
      throw new Error(`Invalid Postman request file: ${partName}`);
    }
    return folder;
  }),
);

// Keep the generated collection outside the repository in the runner's temp directory.
await writeFile(
  resolve(outputPath),
  `${JSON.stringify({ ...manifest, item: folders }, null, 2)}\n`,
);
