// Regenerates src/generated/github.json from public data via gh.
// Local sync-time only: needs gh auth. Deploy uses the generated file.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const run = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
const j = (cmd) => JSON.parse(run(cmd));
const OUT = new URL("../src/generated/github.json", import.meta.url);

// portfolio-declared repos: parse canonical owner/name straight from the
// content model so the rail never drifts from the tree.
const src = readFileSync(new URL("../src/content/projects.ts", import.meta.url), "utf8");
const declared = [...new Set([...src.matchAll(/repo:\s*"([^"]+)"/g)].map((m) => m[1]))];

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

// Real contribution calendar: per-day counts for the last ~year.
let calendar = { total: 0, weeks: [] };
try {
  const cal = j(`gh api graphql -f query='query { viewer { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }' --jq '.data.viewer.contributionsCollection.contributionCalendar'`);
  calendar = {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
  };
} catch {
  console.log("graphql calendar unavailable — keeping previous calendar");
  try {
    const prev = JSON.parse(readFileSync(OUT, "utf8"));
    calendar = prev.calendar ?? calendar;
  } catch {
    /* fresh */
  }
}

// Per-repo metadata rail: durable facts only (no prose). Private repos stay
// absent here — the UI renders `private source` from content instead.
let prevRepos = {};
try {
  prevRepos = JSON.parse(readFileSync(OUT, "utf8")).repos ?? {};
} catch {
  /* fresh */
}
const rail = { ...prevRepos };
for (const repo of declared) {
  try {
    const m = j(`gh repo view ${repo} --json nameWithOwner,isPrivate,isFork,parent,stargazerCount,forkCount,primaryLanguage,licenseInfo,latestRelease,repositoryTopics,createdAt,pushedAt,homepageUrl,isArchived,url`);
    if (m.isPrivate) {
      delete rail[repo];
      continue;
    }
    let tagCount = null;
    try {
      tagCount = j(`gh api repos/${repo}/tags --paginate --jq 'length'`);
    } catch {
      /* tags unavailable */
    }
    rail[repo] = {
      repo: m.nameWithOwner,
      fork: m.isFork,
      upstream: m.parent?.nameWithOwner ?? null,
      stars: m.stargazerCount,
      forks: m.forkCount,
      language: m.primaryLanguage?.name ?? null,
      license: m.licenseInfo?.spdxId ?? m.licenseInfo?.name ?? null,
      topics: (m.repositoryTopics ?? []).map((t) => t.name).slice(0, 8),
      created: (m.createdAt ?? "").slice(0, 10),
      pushed: (m.pushedAt ?? "").slice(0, 10),
      homepage: m.homepageUrl || null,
      archived: m.isArchived,
      tags: tagCount,
      release: m.latestRelease?.tagName ?? null,
      url: m.url,
    };
    console.log(`rail ${repo}: ★${m.stargazerCount} ${m.primaryLanguage?.name ?? ""}`);
  } catch (e) {
    console.log(`rail ${repo}: unavailable — keeping previous`);
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
  calendar,
  repos: rail,
};
writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log(`synced ${data.syncedAt}: ${data.repoCount} repos, ${merged.length} merged, ${open.length} open, ${calendar.total} contributions, rail ${Object.keys(rail).length}`);
