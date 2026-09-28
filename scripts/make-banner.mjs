// GitHub social preview banner (1280x640) — reuses the canonical wordmark
// PNG + Pry's canonical idle sprite (src/system/pry-sprite.ts). No invented
// brand: same ivory/graphite/periwinkle workstation language as the site.
// Usage: node scripts/make-banner.mjs  (needs rsvg-convert)
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRY_W, PRY_H, pryIdleRects } from "../src/system/pry-sprite.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// base64-embed: rsvg-convert ignores bare filesystem paths in <image href>
const wordmarkB64 = readFileSync(join(root, "public", "deepnar-wordmark.png")).toString("base64");

const PX = 7; // pry pixel size on the banner
const pry = pryIdleRects(false)
  .replaceAll("BODY", "#7c8aff")
  .replaceAll("DARK", "#0b0c11")
  .replace(/<rect x="(\d+)" y="(\d+)" width="1" height="1"/g,
    (_, x, y) => `<rect x="${+x * PX}" y="${+y * PX}" width="${PX}" height="${PX}"`);

const mono = "DejaVu Sans Mono, ui-monospace, monospace";
const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
<rect width="1280" height="640" fill="#f4f2ec"/>
<rect x="48" y="48" width="1184" height="544" fill="none" stroke="#3a354d" stroke-width="2"/>
<rect x="48" y="48" width="1184" height="52" fill="#e9e4d6"/>
<circle cx="82" cy="74" r="7" fill="#8b90a7"/><circle cx="108" cy="74" r="7" fill="#8b90a7"/><circle cx="134" cy="74" r="7" fill="#7c8aff"/>
<text x="160" y="81" font-family="${mono}" font-size="22" fill="#3a354d">deepnar@orien — ~/workstation</text>
<image href="data:image/png;base64,${wordmarkB64}" x="290" y="130" width="700" height="257"/>
<text x="640" y="432" text-anchor="middle" font-family="${mono}" font-size="34" letter-spacing="14" fill="#7c8aff">WORKSTATION</text>
<text x="640" y="474" text-anchor="middle" font-family="${mono}" font-size="22" fill="#3a354d">AI Systems · Research · Software Engineering</text>
<text x="640" y="512" text-anchor="middle" font-family="${mono}" font-size="17" fill="#8b90a7">personal workstation portfolio — keyboard-first, no SaaS shine</text>
<g transform="translate(1030,470) scale(1)">
<rect x="-14" y="-46" width="86" height="34" fill="#f4f2ec" stroke="#3a354d" stroke-width="2"/>
<text x="29" y="-21" text-anchor="middle" font-family="${mono}" font-size="20" fill="#3a354d">heyy</text>
<g transform="translate(0,0)">${pry}</g>
</g>
<text x="60" y="576" font-family="${mono}" font-size="16" fill="#8b90a7">~/about ~/projects ~/research ~/oss ~/signal</text>
</svg>`;

const tmp = join(root, ".work", "banner.svg");
writeFileSync(tmp, svg);
execFileSync("rsvg-convert", ["-w", "1280", "-h", "640", tmp, "-o", join(root, "public", "github-social-preview.png")]);
console.log("banner ok:", readFileSync(join(root, "public", "github-social-preview.png")).length, "bytes");
