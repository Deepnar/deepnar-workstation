// Fails the build-step if likely secrets/private data sit in shippable files.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src", "public", "scripts"];
const SKIP = ["node_modules", ".next"];
const PATTERNS = [
  /rzp_live_[A-Za-z0-9]+/,
  /sk-(live|proj)-[A-Za-z0-9]+/,
  /ghp_[A-Za-z0-9]{20,}/,
  /gho_[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA )?PRIVATE KEY-----/,
  /[A-Za-z0-9-_]{20,}\.apps\.googleusercontent\.com/,
  /\b\d{10}\b(?=.*(phone|mobile|tel))/i,
];

let hits = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (SKIP.some((s) => p.includes(s))) continue;
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const text = readFileSync(p, "utf8");
    PATTERNS.forEach((re, i) => {
      if (re.test(text)) hits.push(`${p} :: pattern#${i}`);
    });
  }
};
try {
  ROOTS.forEach((r) => { try { walk(r); } catch { /* missing dir */ } });
} catch (e) { console.error(e); process.exit(1); }
if (hits.length) {
  console.error("secret scan FAILED:\n" + hits.join("\n"));
  process.exit(1);
}
console.log("secret scan clean.");
