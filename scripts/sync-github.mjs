// Regenerates src/generated/github.json from public data via gh.
// Local sync-time only: needs gh auth. Deploy uses the generated file.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const run = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
const j = (cmd) => JSON.parse(run(cmd));
const OUT = new URL("../src/generated/github.json", import.meta.url);

const user = j(`gh api user --jq '{repos: .public_repos}'`);
const repos = j(`gh repo list Deepnar --limit 50 --json name,stargazerCount`);
const stars = repos
  .filter((r) => r.stargazerCount > 0)
  .sort((a, b) => b.stargazerCount - a.stargazerCount)
  .slice(0, 8)
  .map((r) => ({ repo: `Deepnar/${r.name}`, stars: r.stargazerCount }));
const merged = j(`gh search prs --author Deepnar --merged --limit 30 --json title,url,repository`)
  .map((p) => ({ title: p.title, repo: p.repository.nameWithOwner, url: p.url }));
const open = j(`gh search prs --author Deepnar --state open --limit 30 --json title,url,repository`)
  .map((p) => ({ title: p.title, repo: p.repository.nameWithOwner, url: p.url }));

let activityWeeks = [];
try {
  activityWeeks = j(`gh api graphql -f query='{ viewer { contributionsCollection { contributionCalendar { weeks { contributionDays { contributionCount } } } } } }' --jq '.data.viewer.contributionsCollection.contributionCalendar.weeks[-20:] | map(.contributionDays | map(.contributionCount) | add)'`);
} catch {
  console.log("graphql calendar unavailable — keeping previous activityWeeks");
  try {
    activityWeeks = JSON.parse(readFileSync(OUT, "utf8")).activityWeeks ?? [];
  } catch {
    activityWeeks = [];
  }
}

const data = {
  syncedAt: new Date().toISOString().slice(0, 10),
  repoCount: user.repos,
  stars,
  mergedPRs: merged.length,
  openPRs: open.length,
  merged: merged.slice(0, 12),
  open: open.slice(0, 12),
  activityWeeks,
};
writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log(`synced ${data.syncedAt}: ${data.repoCount} repos, ${merged.length} merged, ${open.length} open`);
