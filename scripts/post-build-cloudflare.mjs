import fs from "node:fs";
import path from "node:path";

const workerSrc = path.resolve(".open-next/worker.js");
const workerDest = path.resolve(".open-next/assets/_worker.js");

if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, workerDest);
  console.log("Successfully prepared .open-next/assets/_worker.js for Cloudflare Pages SSR");
} else {
  console.warn("Worker source not found at .open-next/worker.js");
}
