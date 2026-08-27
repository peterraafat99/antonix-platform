import { build } from "esbuild";
import path from "node:path";
import fs from "node:fs";

const workerSrc = path.resolve(".open-next/worker.js");
const workerDest = path.resolve(".open-next/assets/_worker.js");

if (fs.existsSync(workerSrc)) {
  await build({
    entryPoints: [workerSrc],
    outfile: workerDest,
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: ["node:*", "cloudflare:*", "@cloudflare/*"],
    conditions: ["workerd", "worker", "browser"],
  });
  console.log("Successfully compiled self-contained _worker.js for Cloudflare Pages SSR");
} else {
  console.warn(".open-next/worker.js not found, skipping bundle");
}
