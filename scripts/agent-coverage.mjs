// Agent coverage harness (dev-only): compiles the REAL assistant + content
// graph to CJS and runs hundreds of varied utterances through answer().
// Run: node scripts/agent-coverage.mjs
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = "/tmp/agentcov";
mkdirSync(OUT, { recursive: true });

const files = [
  "src/lib/assistant/language.ts",
  "src/lib/assistant/engine.ts",
  "src/content/profile.ts",
  "src/content/projects.ts",
  "src/content/research.ts",
  "src/content/oss.ts",
  "src/content/about.ts",
  "src/vfs/vfs.ts",
];
const tsconfig = {
  extends: `${ROOT}/tsconfig.json`,
  compilerOptions: { module: "commonjs", target: "es2020", outDir: OUT, skipLibCheck: true, noEmit: false, rootDir: ROOT },
  include: files.map((f) => `${ROOT}/${f}`),
};
writeFileSync(`${OUT}/tsconfig.cov.json`, JSON.stringify(tsconfig));
try { execSync(`rm -f ${OUT}/tsconfig.cov.tsbuildinfo`, { stdio: "pipe" }); } catch { /* fresh */ }
execSync(`npx tsc -p ${OUT}/tsconfig.cov.json`, { cwd: ROOT, stdio: "pipe" });
// rewrite @/ requires → relative
const OUTSRC = `${OUT}/src`;
for (const f of readdirSync(OUTSRC, { recursive: true })) {
  if (!String(f).endsWith(".js")) continue;
  const p = join(OUTSRC, String(f));
  let s = readFileSync(p, "utf8");
  s = s.replace(/require\("@\/(content|vfs)\//g, (m, d) => {
    const depth = String(f).split("/").length - 1;
    const rel = "../".repeat(String(f).split("/").length - 1);
    return `require("${rel}${d}/`;
  });
  writeFileSync(p, s);
}
// generated github.json isn't imported by engine — stub the vfs import chain if needed
const { answer } = await import(`${OUTSRC}/lib/assistant/engine.js`);

/** [utterance, expectedIntent, note] — typos, slang, terse, polite, verbose, aliases */
const FIX = [
  ["hello", "greeting"], ["hey", "greeting"], ["heyy", "greeting"], ["heyyyy", "greeting"],
  ["yo", "greeting"], ["yooo", "greeting"], ["sup", "greeting"], ["what's up", "unknown"],
  ["hi there", "greeting"], ["morning", "greeting"], ["good evening", "greeting"],
  ["who are you", "whoami-agent"], ["what are you", "are-you-ai"], ["are you real ai", "are-you-ai"],
  ["are you chatgpt", "are-you-ai"], ["how do you work", "how-work"],
  ["show me ice", "open"], ["what's ice", "project"], ["tell me about ice", "project"],
  ["open ice", "open"], ["take me to ice", "open"], ["where is ice", "open"],
  ["what did he build for memory", "project"], ["show me his memory project", "open"],
  ["what's the big ai project", "projects-list"],
  ["resume", "resume"], ["cv", "resume"], ["show his resume", "resume"],
  ["download resume", "resume"], ["where's the cv", "resume"], ["can i see his resume", "resume"],
  ["resmue", "resume"], ["downlod cv", "resume"],
  ["what does deepesh do", "whois"], ["who is deepesh", "whois"], ["tell me about him", "whois"],
  ["about", "whois"], ["what is this website", "whatis-site"], ["why does this look like linux", "whatis-site"],
  ["research", "research"], ["papers", "research"], ["publications", "research"],
  ["what has he researched", "research"], ["show me the paper", "research"], ["what is lsrep", "research"],
  ["contact", "contact"], ["email", "contact"], ["how do i reach him", "contact"],
  ["linkedin", "contact"], ["github", "github"],
  ["best projects", "projects-list"], ["biggest projects", "projects-list"], ["show projects", "projects-list"],
  ["ai projects", "projects-list"], ["ml stuff", "projects-list"], ["systems work", "projects-list"],
  ["linux stuff", "project"], ["open source", "oss"], ["contributions", "oss"],
  ["what got merged upstream", "oss"], ["tell me about nexus", "project"], ["open nexus", "open"],
  ["what is timetable generator", "project"], ["open the timetable thing", "open"],
  ["where is that fucking timetable thing", "open"], ["fuck you", "hostile"], ["stupid", "unknown"],
  ["this website sucks", "hostile"], ["chutiya hai kya", "hostile"], ["kya bakwas hai", "hostile"],
  ["bc", "unknown"], ["thanks", "thanks"], ["thx", "thanks"], ["bye", "goodbye"],
  ["ice vs nexus", "compare"], ["compare ice and timetable-generator", "compare"],
  ["how is lsrep related to ice", "compare"], ["what is better ice or forge", "compare"],
  ["where am i", "location"], ["what is this file", "location"],
  ["education", "education"], ["where did he study", "education"], ["cgpa", "education"],
  ["experience", "experience"], ["internships", "experience"], ["where has he worked", "experience"],
  ["competitions", "competitions"], ["hackathons", "competitions"], ["did he win anything", "competitions"],
  ["tell me about SIH", "competitions"], ["dipex", "competitions"], ["certificates", "competitions"],
  ["skills", "skills"], ["what are his skills", "skills"], ["tech stack", "skills"],
  ["what stack does ice use", "stack"], ["eval results", "results"], ["f1 scores", "results"],
  ["why was ice built", "why"], ["open the paper", "research"], ["download the cv", "resume"],
  ["take me to civicresolve", "open"], ["open notable", "open"], ["show achievements", "competitions"],
  ["help", "help"], ["what can you do", "help"], ["tour", "tour"], ["show me around", "tour"],
  ["pry", "pet"], ["the cat", "pet"], ["open terminal", "terminal"],
  ["asdkfjhasdf", "unknown"], ["tell me about quantum bananas", "unknown"],
  ["open it", "open"], ["what stack does it use", "stack"],
];

const CTX = { cwd: "/home/deepnar", lastEntity: null, lastIntent: null };
let pass = 0, fail = 0;
const fails = [];
// contextual follow-ups share state like the real client
let follow = { cwd: "/home/deepnar", lastEntity: "ice", lastIntent: "project" };
for (const [utt, want] of FIX) {
  const ctx = /^(open it|what stack does it use)/.test(utt) ? follow : CTX;
  const a = answer(utt, ctx);
  // feed conversation memory like Agent.tsx does
  if (a.entity) follow = { ...follow, lastEntity: a.entity, lastIntent: a.intent };
  if (a.intent === want) pass++;
  else { fail++; fails.push(`${utt} → ${a.intent} (want ${want})`); }
}
// location with a project cwd
const loc = answer("what is this?", { cwd: "/home/deepnar/projects/ice", lastEntity: null, lastIntent: null });
if (loc.intent === "location" && loc.entity === "ice") pass++; else { fail++; fails.push(`location-in-ice → ${loc.intent}/${loc.entity}`); }

console.log(`agent fixtures: ${pass} pass, ${fail} fail / ${FIX.length + 1} total`);
if (fails.length) { console.log("MISSES:"); for (const f of fails.slice(0, 20)) console.log("  " + f); }
process.exit(fail ? 1 : 0);
