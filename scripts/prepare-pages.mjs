import fs from "node:fs";
import path from "node:path";

const openNextDir = ".open-next";
const assetsDir = ".open-next/assets";

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy all SSR dependencies into the assets dir so _worker.js can import them
copyDir(`${openNextDir}/server-functions`, `${assetsDir}/server-functions`);
copyDir(`${openNextDir}/cloudflare`, `${assetsDir}/cloudflare`);
copyDir(`${openNextDir}/middleware`, `${assetsDir}/middleware`);
copyDir(`${openNextDir}/.build`, `${assetsDir}/.build`);

// Rename worker.js → _worker.js (Cloudflare Pages Advanced Mode entry point)
fs.copyFileSync(`${openNextDir}/worker.js`, `${assetsDir}/_worker.js`);

console.log("✅ Cloudflare Pages build prepared — _worker.js ready");
