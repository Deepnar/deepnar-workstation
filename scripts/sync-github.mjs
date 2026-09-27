// Refreshes github-sync.json from public data via gh. Nothing is published;
// reconcile the diff into src/content/oss.ts by hand.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const run = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
const prs = (state) =>
  JSON.parse(run(`gh search prs --author Deepnar --${state} --limit 30 --json title,url,repository`)).map((p) => ({
    title: p.title,
    repo: p.repository.nameWithOwner,
    url: p.url,
    state: state === "merged" ? "merged" : "open",
  }));

const data = {
  fetchedAt: new Date().toISOString(),
  merged: prs("merged"),
  open: prs("open"),
  repos: JSON.parse(run(`gh repo list Deepnar --limit 50 --json name,stargazerCount,pushedAt`)),
};
writeFileSync(new URL("../github-sync.json", import.meta.url), JSON.stringify(data, null, 2));
console.log(`synced ${data.merged.length} merged + ${data.open.length} open PRs → github-sync.json`);
