// gen-cursors.mjs — ONE authoritative cursor-hotspot pipeline.
// Reads scripts/cursor-hotspots-upstream.json (vendored catppuccin/cursors
// v2.0.0 metadata; hotspots already in 32px art coordinates — NEVER rescale),
// rounds to CSS-integer hotspots, writes public/cursors/hotspots.json, and
// rewrites every cursor:url() coordinate in src/app/cursors.css from that map.
// Usage: node scripts/gen-cursors.mjs [--check]
//   default: regenerate + report diff. --check: exit 1 on any mismatch (CI).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = JSON.parse(readFileSync(join(root, "scripts/cursor-hotspots-upstream.json"), "utf8"));
const check = process.argv.includes("--check");

const hot = {};
for (const [role, s] of Object.entries(cache.roles)) {
  hot[role] = [Math.round(s.x), Math.round(s.y)];
}

let fail = 0;
const hotPath = join(root, "public/cursors/hotspots.json");
const cur = JSON.parse(readFileSync(hotPath, "utf8"));
for (const [role, [x, y]] of Object.entries(hot)) {
  const [cx, cy] = cur[role] ?? [];
  if (cx !== x || cy !== y) {
    console.log(`hotspot ${role}: have (${cx},${cy}) want (${x},${y}) [upstream ${cache.roles[role].src}/${cache.roles[role].file}]`);
    fail++;
  }
}
const cssPath = join(root, "src/app/cursors.css");
let css = readFileSync(cssPath, "utf8");
css = css.replace(/url\("\/cursors\/([a-z-]+)\.png"\) \d+ \d+/g, (m, name) => {
  if (!hot[name]) { console.log(`css role with no upstream source: ${name}`); fail++; return m; }
  return `url("/cursors/${name}.png") ${hot[name][0]} ${hot[name][1]}`;
});
for (const role of Object.keys(hot)) {
  if (!css.includes(`/cursors/${role}.png`)) { console.log(`upstream role missing from css: ${role}`); fail++; }
}

if (check) {
  console.log(fail === 0 ? "cursors: hotspots.json + cursors.css match upstream (verbatim, unscaled)" : `cursors: ${fail} mismatch(es)`);
  process.exit(fail === 0 ? 0 : 1);
}
writeFileSync(hotPath, JSON.stringify(hot, null, 1) + "\n");
writeFileSync(cssPath, css);
console.log(`cursors: wrote ${Object.keys(hot).length} hotspots (upstream verbatim, rounded) + synced cursors.css`);
