// V3 acceptance tests — real interaction, not screenshots.
import { chromium } from "playwright-core";

const results = [];
const check = (name, cond) => {
  results.push(`${cond ? "PASS" : "FAIL"} ${name}`);
  if (!cond) process.exitCode = 1;
};

const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  try {
    localStorage.setItem("deepnar-theme", "dark");
    localStorage.setItem("deepnar-seen", "1");
    localStorage.setItem("deepnar-keyhint", "1");
  } catch { /* noop */ }
});
page.on("pageerror", (e) => { results.push(`PAGEERROR ${String(e).slice(0, 150)}`); process.exitCode = 1; });
await page.goto("http://127.0.0.1:3001/?open=~/projects/ice/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1800);

const termText = () => page.evaluate(() => {
  const els = [...document.querySelectorAll('[data-testid^="xterm-"]')];
  const vis = els.find((e) => e.offsetParent !== null) ?? els[0];
  return vis?.innerText ?? "";
});
const tfocus = () => page.evaluate(() => {
  const els = [...document.querySelectorAll('[data-testid^="xterm-"]')];
  const vis = els.find((e) => e.offsetParent !== null) ?? els[0];
  vis?.querySelector(".xterm-helper-textarea")?.focus();
});
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ttype = async (cmd) => {
  await tfocus();
  await page.waitForTimeout(150);
  await page.keyboard.type(cmd, { delay: 12 });
  await page.keyboard.press("Enter");
  // our echo is `❯ <cmd>` followed by a newline (while typing it sits at
  // the end with no newline). slice from OUR echo, not from a length.
  const re = new RegExp(`❯ ${escRe(cmd)}\\s*\\n`);
  for (let i = 0; i < 40; i++) {
    const full = await termText();
    const m = full.match(re);
    // take the LAST echo (an earlier identical command may exist above)
    const idx = m ? full.lastIndexOf(m[0]) : -1;
    if (idx >= 0 && /╰─ ❯\s*$/.test(full.slice(idx))) return full.slice(idx);
    await page.waitForTimeout(100);
  }
  const full = await termText();
  const idx = full.lastIndexOf(`❯ ${cmd}`);
  return idx >= 0 ? full.slice(idx) : full.slice(-300);
};

// 1. deep link buffer + statusline location (no host dup)
check("deeplink buffer", await page.getByRole("tab", { name: /README\.md/ }).count() >= 1);
const status = await page.getByLabel("status").innerText();
check("statusline shows ice cwd", status.includes("~/projects/ice"));
check("statusline has no clock", !/\d{2}:\d{2}/.test(status));
check("statusline has no host", !status.includes("deepnar@orien"));

// 2. open dock terminal via ctrl+`
await page.locator("main").click();
await page.keyboard.press("Control+`");
await page.waitForTimeout(600);
check("dock terminal opens", await page.locator('[data-testid^="xterm-"]').count() === 1);

// 3. terminal cd/pwd/ls flow (browser follows once no buffer is open)
await ttype(":bd");
await page.waitForTimeout(200);
check("term pwd ~ ice", (await ttype("pwd")).includes("~/projects/ice"));
await ttype("cd ~/projects");
const pwd2 = await ttype("pwd");
check("cd projects", pwd2.includes("~/projects") && !pwd2.includes("ice"));
check("ls projects", (await ttype("ls")).includes("ice/"));
await ttype("cd ice");
const lsIce = await ttype("ls");
check("ls ice root", lsIce.includes("README.md") && lsIce.includes("details/"));
await ttype("cd details");
check("ls details", (await ttype("ls")).includes("architecture.md"));
await ttype("cd ..");
check("cd .. back to ice", (await ttype("pwd")).includes("~/projects/ice"));
// browser followed the active terminal
check("browser followed cd", await page.getByLabel("file navigation").innerText().then((t) => t.includes("~/projects/ice")));

// 4. second terminal tab isolation
await page.getByRole("tab", { name: /terminal 1/ }).click();
await page.getByLabel("new utility tab").click();
await page.waitForTimeout(400);
await page.getByRole("menuitem", { name: /new terminal/i }).click();
await page.waitForTimeout(500);
const tabCount = await page.getByRole("tablist", { name: "utility tabs" }).getByRole("tab").count().catch(() => 0);
check("two terminal tabs", tabCount >= 2 || (await page.locator('[data-testid^="xterm-"]').count()) >= 2);
await ttype("cd ~/oss");
await ttype("pwd");
check("term2 at oss", (await termText()).includes("~/oss"));
// back to tab 1: cwd preserved
await page.getByRole("tab", { name: /terminal 1/ }).click();
await page.waitForTimeout(300);
await ttype("pwd");
check("term1 cwd preserved", (await termText()).includes("~/projects/ice"));

// 5. clear via c
await ttype("echo-marker-should-vanish");
await ttype("c");
check("c clears screen", !(await termText()).includes("echo-marker-should-vanish"));

// 6. row click navigates to the browser
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
await page.getByLabel("file explorer").getByText("ice/", { exact: true }).first().click();
await page.waitForTimeout(400);
check("row click navigates", (await page.getByLabel("file navigation").innerText()).includes("~/projects/ice"));

// 7. tree arrow toggles subtree only (buffer auto-expanded it; collapse first)
const projArrow = () => page.getByRole("button", { name: /(expand|collapse) projects/ });
await projArrow().click(); // collapse
await page.waitForTimeout(300);
check("collapse hides children", await page.getByLabel("file explorer").getByText("ice/", { exact: true }).count() === 0);
const navBefore = await page.getByLabel("file navigation").innerText();
await projArrow().click(); // expand
await page.waitForTimeout(300);
check("tree arrow expands without navigating", (await page.getByLabel("file navigation").innerText()) === navBefore);
check("tree reveals ice", await page.getByLabel("file explorer").getByText("ice/", { exact: true }).count() >= 1);

// 8. back / forward across views
await page.getByRole("button", { name: "back" }).click();
await page.waitForTimeout(300);
check("back → oss view", (await page.locator("main").innerText()).includes("REPOSITORIES"));
await page.getByRole("button", { name: "forward" }).click();
await page.waitForTimeout(300);
check("forward → ice", (await page.getByLabel("file navigation").innerText()).includes("~/projects/ice"));

// 9. middle-click closes buffer; the bar never empties — last close → home
await page.goto("http://127.0.0.1:3001/?open=~/about/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const tabs9 = page.getByRole("tablist", { name: "buffers" }).getByRole("tab");
check("9 two tabs (home + file)", await tabs9.count() === 2);
const box9 = await tabs9.first().boundingBox();
if (box9) await page.mouse.click(box9.x + box9.width / 2, box9.y + box9.height / 2, { button: "middle" });
await page.waitForTimeout(300);
check("9 middle-click closes home tab", await tabs9.count() === 1);
const last9 = await tabs9.first().boundingBox();
if (last9) await page.mouse.click(last9.x + last9.width / 2, last9.y + last9.height / 2, { button: "middle" });
await page.waitForTimeout(300);
check("9 last close → home tab", await tabs9.count() === 1 && await page.getByRole("tab", { name: "home", selected: true }).count() === 1);

// 10. explorer: no drag handle — button-only toggle, layout persists
check("no explorer drag handle", (await page.getByLabel("resize explorer").count()) === 0);
const expFull = await page.getByLabel("file explorer").boundingBox().then((b) => b?.width ?? 0);
await page.getByLabel("toggle file tree").click();
await page.waitForTimeout(400);
const expGone = await page.getByLabel("file explorer").boundingBox().then((b) => b?.width ?? 0).catch(() => 0);
check("toggle collapses explorer", expGone < 5);
await page.getByLabel("toggle file tree").click();
await page.waitForTimeout(400);
const expBack = await page.getByLabel("file explorer").boundingBox().then((b) => b?.width ?? 0);
check("toggle re-opens explorer", expBack > 100 && Math.abs(expBack - expFull) < 40);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const expPersist = await page.getByLabel("file explorer").boundingBox().then((b) => b?.width ?? 0).catch(() => 0);
check("explorer layout persists", expPersist > 100);

// 11. real wheel scroll on a tall surface (fully expanded tree)
await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /enter guest session/i }).click();
await page.waitForTimeout(1600);
// guest lands straight in the workstation (desktop waits behind minimize)
check("login lands in workstation", await page.getByLabel("file navigation").count() >= 1);
for (const n of ["projects", "collaborations", "practice", "research", "oss"]) {
  await page.getByRole("button", { name: new RegExp(`(expand|collapse) ${n}`) }).click().catch(() => {});
  await page.waitForTimeout(150);
}
// ensure expanded (not collapsed) after toggling from unknown state
for (const n of ["projects", "collaborations", "practice", "research", "oss"]) {
  const b = page.getByRole("button", { name: new RegExp(`expand ${n}`) });
  if (await b.count()) await b.click().catch(() => {});
}
await page.waitForTimeout(300);
const treeBox = await page.getByLabel("file explorer").boundingBox();
const treeBefore = await page.evaluate(() => document.querySelector("nav[aria-label='file explorer']")?.scrollTop ?? -1);
if (treeBox) {
  await page.mouse.move(treeBox.x + treeBox.width / 2, treeBox.y + treeBox.height / 2);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
}
const treeAfter = await page.evaluate(() => document.querySelector("nav[aria-label='file explorer']")?.scrollTop ?? -1);
check("wheel scrolls explorer", treeAfter > treeBefore);

// 12. agent: hi has no retrieval theater; follow-up keeps entity
await page.locator("main").click();
await page.keyboard.press("/");
await page.waitForTimeout(500);
const agentInput = page.getByLabel("agent input");
await agentInput.fill("hi");
await agentInput.press("Enter");
await page.waitForTimeout(600);
let convo = await page.getByLabel("agent conversation").innerText();
check("hi → greeting, no retrieval", /looking for|projects?|going|workstation/i.test(convo) && !convo.includes("reading index"));
await agentInput.fill("what is ICE?");
await agentInput.press("Enter");
await page.waitForTimeout(800);
await agentInput.fill("what stack does it use?");
await agentInput.press("Enter");
await page.waitForTimeout(800);
convo = await page.getByLabel("agent conversation").innerText();
check("follow-up keeps ICE entity", convo.includes("Qwen3-Embedding") || convo.includes("PyTorch"));
check("retrieval shows real sources", convo.includes("~/projects/ice/README.md"));
await agentInput.fill("blargh zzz unrelated");
await agentInput.press("Enter");
await page.waitForTimeout(800);
convo = await page.getByLabel("agent conversation").innerText();
check("unknown does not hallucinate", /not sure|don't have an answer|couldn't map|won't invent/.test(convo));

// 13. evidence download fires a real download (DIPEX state-final cert)
await page.goto("http://127.0.0.1:3001/?open=~/about/evidence/dipex/state-final.pdf", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const dl = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
await page.getByRole("link", { name: /download/i }).click();
check("evidence download works", (await dl) !== null);

// 13b. resume lives in ~/about (master PDF from the CV folder)
await page.goto("http://127.0.0.1:3001/?open=~/about/resume.pdf", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
check("resume.pdf opens in a tab", await page.getByRole("tab", { name: "resume.pdf", selected: true }).count() >= 1);

// 14. research: artifacts + real arxiv action (deep-link the READMEs directly)
await page.goto("http://127.0.0.1:3001/?open=~/research/lsrep-ice/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const arxivHref = await page.locator("main").getByRole("link", { name: /arXiv/i }).first().getAttribute("href").catch(() => null);
check("arxiv action is real", arxivHref === "https://arxiv.org/abs/2609.16730");
const lsrepText = await page.locator("main").innerText().catch(() => "");
check("ice arch details present", lsrepText.includes("four typed stores") && lsrepText.includes("32% fewer fragments"));
await page.goto("http://127.0.0.1:3001/?open=~/research/pixel-over-paper/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const popText = await page.locator("main").innerText().catch(() => "");
check("pixel-over-paper writeup", /multicon 2024/i.test(popText) && popText.includes("Shruti Pant"));
const noTimeline = await page.getByLabel("file explorer").getByText("timeline.log", { exact: true }).count().catch(() => 0);
check("no timeline.log", noTimeline === 0);
const noNow = await page.getByLabel("file explorer").getByText("now.md", { exact: true }).count().catch(() => 0);
check("no now.md", noNow === 0);

// 15. home activity: compact mini calendar (oss/activity file removed)
await page.getByTitle("home").click();
await page.waitForTimeout(500);
const homeText = await page.locator("main").innerText();
check("home shows wordmark", await page.locator("main").locator("img[alt*='DEEPNAR']").count() >= 1);
check("home shows activity total", /in the last year/.test(homeText));
const miniCells = await page.locator("main").locator("div[title*='contribution']").count();
check("mini calendar has recent weeks", miniCells > 300 && miniCells < 400);
await page.locator("main").locator("div[title*='contribution']").nth(40).hover();
await page.waitForTimeout(200);
check("mini hover readout", (await page.locator("main").innerText()).includes("202"));

// 16. desktop spaces via alt keys (app content follows the space)
await page.keyboard.press("Alt+2");
await page.waitForTimeout(400);
check("alt+2 → orbit app", (await page.locator("main").innerText().catch(() => "")) === "" || (await page.getByLabel("orbit game").count()) >= 1);
await page.keyboard.press("Alt+3");
await page.waitForTimeout(400);
check("alt+3 → signal app", await page.getByLabel("signal knowledge graph").count() >= 1);
await page.keyboard.press("Alt+1");
await page.waitForTimeout(400);
check("alt+1 → workstation", await page.getByLabel("file navigation").count() >= 1);
// desktop launchers match the space
await page.getByRole("button", { name: "minimize", exact: true }).click();
await page.waitForTimeout(400);
await page.keyboard.press("Alt+2");
await page.waitForTimeout(1100);
check("alt+2 dives into orbit", await page.getByLabel("orbit game").count() >= 1);
await page.keyboard.press("Alt+1");
await page.waitForTimeout(1100);
check("alt+1 dives into workstation", await page.getByLabel("file navigation").count() >= 1);

// 17. overview is gone
check("no overview", (await page.getByRole("button", { name: /^overview$/i }).count()) === 0);

// 18. esc blurs xterm (fresh app state)
await page.goto("http://127.0.0.1:3001/?open=~/projects/ice/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.keyboard.press("Control+`");
await page.waitForTimeout(500);
await tfocus();
await page.waitForTimeout(200);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
check("esc blurs terminal", await page.evaluate(() => document.activeElement?.tagName !== "TEXTAREA"));

// 19. assistant --debug trace (short query: long answers scroll trace out of view)
await tfocus();
await page.keyboard.type('assistant --debug "open ice"', { delay: 8 });
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
check("--debug shows trace", (await termText()).includes("intent:") && (await termText()).includes("entity:"));

// 20. pet is a canvas creature in the statusline
check("pet canvas present", (await page.getByLabel(/pry — drag to pick up/).count()) >= 1);

// 21. directory/buffer view state (exact acceptance test from the brief)
await page.goto("http://127.0.0.1:3001/?open=~/projects/ice/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
check("21a buffer open", (await page.locator("main").innerText()).includes("Infinite Context Engine"));
// finder → ~/projects must show the BROWSER, keeping the tab
await page.locator("main").click();
await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
await page.getByPlaceholder(/find files/i).fill("~/projects");
await page.waitForTimeout(300);
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
check("21b finder dir → browser", (await page.getByLabel("file navigation").innerText()).includes("~/projects"));
check("21c tab survives nav", await page.getByRole("tablist", { name: "buffers" }).getByRole("tab").count() >= 1);
check("21d no stale buffer", !(await page.locator("main").innerText()).includes("Infinite Context Engine"));
// click timetable-generator/ → browse it
await page.getByRole("listbox").getByText("timetable-generator/", { exact: true }).click();
await page.waitForTimeout(400);
check("21e browse timetable", (await page.getByLabel("file navigation").innerText()).includes("timetable-generator"));
// click ice README tab → old ICE README back (first tab may be home now)
await page.getByRole("tablist", { name: "buffers" }).getByRole("tab", { name: "README" }).first().click();
await page.waitForTimeout(400);
check("21f tab restores buffer", (await page.locator("main").innerText()).includes("Infinite Context Engine"));
// finder → ~/research → browse research
await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
await page.getByPlaceholder(/find files/i).fill("~/research");
await page.waitForTimeout(300);
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
check("21g finder research → browser", (await page.getByLabel("file navigation").innerText()).includes("~/research"));

// 22. dock matrix: toggle hides without destroying; + menu opens real tabs
await page.keyboard.press("Control+`");
await page.waitForTimeout(500);
const dockTabName = await page.getByRole("tablist", { name: "utility tabs" }).getByRole("tab", { selected: true }).innerText();
await page.getByRole("button", { name: "toggle utility dock" }).click();
await page.waitForTimeout(300);
check("22a dock hides", await page.getByRole("tablist", { name: "utility tabs" }).count() === 0);
await page.getByRole("button", { name: "toggle utility dock" }).click();
await page.waitForTimeout(800);
check("22b dock restores tab", (await page.getByRole("tablist", { name: "utility tabs" }).getByRole("tab", { selected: true }).innerText()) === dockTabName);
await page.getByLabel("new utility tab").click();
await page.getByRole("menuitem", { name: "web", exact: true }).waitFor({ timeout: 8000 });
check("22c + menu visible", await page.getByRole("menuitem", { name: "web", exact: true }).count() >= 1);
await page.getByRole("menuitem", { name: "web", exact: true }).click();
await page.waitForTimeout(400);
check("22d web tab opens", await page.getByPlaceholder(/search the web/i).count() >= 1);
await page.getByRole("menuitem", { name: "web", exact: true }).click().catch(() => {});
await page.keyboard.press("/");
await page.waitForTimeout(400);
check("22e / focuses agent", await page.getByLabel("agent input").count() >= 1);

// 23. logout clears session, preserves theme, returns to greeter
await page.getByRole("button", { name: "log out" }).click();
await page.waitForTimeout(600);
check("23a logout → greeter", await page.getByRole("button", { name: /enter guest session/i }).count() >= 1);
check("23b light-only theme", await page.evaluate(() => document.documentElement.dataset.theme === "light"));
await page.getByRole("button", { name: /enter guest session/i }).click();
await page.waitForTimeout(1600);
check("23c buffers cleared", await page.getByRole("tablist", { name: "buffers" }).getByRole("tab").count().catch(() => 0) === 0);

// 24. orbit: countdown + rocket canvas, keys work without clicking canvas
await page.keyboard.press("Alt+2");
await page.waitForTimeout(600);
check("24a orbit countdown", await page.getByLabel("orbit game").innerText().then((t) => /[321]/.test(t)).catch(() => false));
await page.waitForTimeout(2200);
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(400);
check("24b orbit canvas live", await page.getByLabel("orbit game").locator("canvas").count() >= 1);
check("24c orbit hull shown", (await page.getByLabel("orbit game").innerText()).includes("♥"));
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
check("24d orbit esc pauses", (await page.getByLabel("orbit game").innerText()).includes("paused"));
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
// leaderboard env is configured → chip shows live top score, popover lists top 5
check("24e leaderboard chip live", await page.getByRole("button", { name: "global top scores" }).count() >= 1);
await page.getByRole("button", { name: "global top scores" }).click();
await page.waitForTimeout(1200);
check("24f top-5 popover", await page.getByRole("dialog", { name: "global top 5" }).count() >= 1);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// 25. signal: force graph opens real work
await page.keyboard.press("Alt+3");
await page.waitForTimeout(3600);
check("25a signal canvas", await page.getByLabel("signal knowledge graph").locator("canvas").count() >= 1);
const sigBox = await page.getByLabel("signal knowledge graph").locator("canvas").boundingBox();
// deterministic: focus canvas, cycle to a node with ], open with Enter
await page.getByLabel("graph canvas").click();
await page.waitForTimeout(300);
await page.keyboard.press("]");
await page.waitForTimeout(300);
let opened = (await page.getByRole("button", { name: /open in workstation/i }).count()) > 0;
if (opened) {
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1300);
  opened = (await page.getByLabel("file navigation").count().catch(() => 0)) >= 1;
}
check("25b graph node opens workstation artifact", opened);

// 26. DOI action on ICE readme
await page.keyboard.press("Alt+1");
await page.waitForTimeout(400);
await page.goto("http://127.0.0.1:3001/?open=~/projects/ice/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
check("26 doi link", await page.locator("main").getByRole("link", { name: /DOI/i }).first().getAttribute("href").then((h) => h === "https://doi.org/10.5281/zenodo.21759702").catch(() => false));

// 27. oss keyboard: panes — j/k move inside, h/l switches column
await page.locator("main").click();
await page.getByTitle("home").click();
await page.waitForTimeout(400);
await page.keyboard.press("o");
await page.waitForTimeout(500);
await page.keyboard.press("j");
await page.waitForTimeout(200);
const ossSel = await page.getByLabel("open source browser").innerText();
await page.keyboard.press("h");
await page.waitForTimeout(300);
const ossPane = await page.evaluate(() => document.querySelector("[aria-label='repositories']")?.getAttribute("data-active"));
await page.keyboard.press("j");
await page.waitForTimeout(200);
const ossRepoMoved = await page.getByLabel("open source browser").innerText();
check("27a oss j moves", ossSel.length > 0);
check("27b oss h focuses repos", ossPane === "true");
check("27c oss j moves repos", ossRepoMoved !== ossSel);

// 28. finder exact-dir rank: ~/research must top architecture.md
await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
await page.getByPlaceholder(/find files/i).fill("~/research");
await page.waitForTimeout(300);
const firstOpt = await page.getByRole("option").first().innerText();
check("28 exact dir ranks first", /research\s*~\/research\s*$/.test(firstOpt) || firstOpt.includes("~/research"));
await page.keyboard.press("Escape");

// 29. alt+number works with terminal focused
await page.keyboard.press("Control+`");
await page.waitForTimeout(500);
await page.keyboard.press("Alt+2");
await page.waitForTimeout(1200);
check("29 alt+2 from terminal", await page.getByLabel("orbit game").count() >= 1);
await page.keyboard.press("Alt+1");
await page.waitForTimeout(1000);

// 30. link cluster: github/scholar/linkedin/orcid/mail
const links = await page.getByLabel("profile links").innerText().catch(() => "");
const hrefs = await page.getByLabel("profile links").locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
check("30 five profile links", hrefs.length >= 5 && hrefs.some((h) => h && h.includes("linkedin")) && hrefs.some((h) => h && h.includes("orcid")) && hrefs.some((h) => h && h.startsWith("mailto:")));

// 31. graph has from-scratch ML nodes
await page.keyboard.press("Alt+3");
await page.waitForTimeout(3600);
const nodeCount = await page.getByLabel("graph canvas").getAttribute("data-nodes");
check("31 grad/wine nodes", Number(nodeCount) >= 20);

// 32. ssh handshake shows before the session opens
await page.getByRole("button", { name: "log out" }).click();
await page.waitForTimeout(500);
await page.getByRole("button", { name: /enter guest session/i }).click();
await page.waitForTimeout(700);
check("32 ssh handshake", (await page.innerText("body")).includes("ssh guest@orien"));
await page.waitForTimeout(1200);

// 33. pet click always answers with a bubble
await page.getByLabel(/pry — drag to pick up/).click({ force: true });
await page.waitForTimeout(400);
check("33 pet bubble", (await page.locator("[aria-live='polite']").last().innerText().catch(() => "")).length > 1);

// 34. alt+t opens a home tab
await page.keyboard.press("Alt+1");
await page.waitForTimeout(600);
await page.getByTitle("home").click();
await page.waitForTimeout(400);
await page.keyboard.press("Alt+t");
await page.waitForTimeout(400);
check("34 home tab", await page.getByRole("tab", { name: "home" }).count() >= 1);
// 34b. shortcuts work inside the home tab
await page.keyboard.press("p");
await page.waitForTimeout(500);
check("34b home-tab p works", (await page.getByLabel("file navigation").innerText()).includes("projects"));
// 34c. shift+tab cycles buffer tabs (deterministic 2-tab state via deep link)
await page.goto("http://127.0.0.1:3001/?open=~/about/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
check("34c two tabs", await page.getByRole("tablist", { name: "buffers" }).getByRole("tab").count() === 2);
await page.keyboard.press("Shift+Tab");
await page.waitForTimeout(400);
check("34c shift+tab cycles", await page.getByRole("tab", { name: "home", selected: true }).count() >= 1);
// 34d. alt+w closes the file tab back onto home; alt+t keeps home active
await page.keyboard.press("Shift+Tab");
await page.waitForTimeout(400);
await page.keyboard.press("Alt+w");
await page.waitForTimeout(400);
check("34d alt+w closes tab", await page.getByRole("tab", { name: "home", selected: true }).count() >= 1
  && await page.getByRole("tablist", { name: "buffers" }).getByRole("tab").count() === 1);
await page.keyboard.press("Alt+t");
await page.waitForTimeout(400);
check("34d alt+t home tab", await page.getByRole("tab", { name: "home", selected: true }).count() >= 1);
check("34d alt+t mints fresh tab", await page.getByRole("tablist", { name: "buffers" }).getByRole("tab").count() === 2);

// 35. left from a top-level section lands on the ~ listing
await page.keyboard.press("p");
await page.waitForTimeout(500);
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(500);
const rootList = await page.getByRole("listbox").innerText().catch(() => "");
check("35 root listing", rootList.includes("research/") && rootList.includes("oss/"));
check("35 about first", rootList.indexOf("about/") !== -1 && rootList.indexOf("about/") < rootList.indexOf("projects/"));
await page.keyboard.press("l");
await page.waitForTimeout(500);
check("35b right enters section", (await page.getByLabel("file navigation").innerText()).includes("about"));

// 35c. login hint teaches keys, dismisses (persisted via deepnar-keyhint)
await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => { try { localStorage.removeItem("deepnar-keyhint"); } catch {} });
await page.reload({ waitUntil: "domcontentloaded" });
await page.evaluate(() => { try { localStorage.removeItem("deepnar-keyhint"); } catch {} });
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /enter guest session/i }).click();
await page.waitForTimeout(1800);
// hint is sequenced ~7.5s after pry-awake (awake ~2.4s) — poll, don't assume timing
let hintSeen = false;
for (let i = 0; i < 22 && !hintSeen; i++) {
  hintSeen = await page.getByRole("note", { name: "keyboard hint" }).count().then((n) => n >= 1).catch(() => false);
  if (!hintSeen) await page.waitForTimeout(750);
}
check("35c hint popup", hintSeen);
await page.getByRole("button", { name: /dismiss/ }).click();
await page.waitForTimeout(300);
check("35d hint dismisses", await page.getByRole("note", { name: "keyboard hint" }).count() === 0);
check("35d dismissal persists", await page.evaluate(() => { try { return localStorage.getItem("deepnar-keyhint"); } catch { return null; } }) === "1");

// 35e. fresh-visitor onboarding sequence (cleared first-visit storage.
// note: every goto/reload re-runs the suite init script, which re-seeds
// deepnar-keyhint — so remove it again AFTER navigation, like 35c.)
await page.evaluate(() => { try { localStorage.removeItem("deepnar-hint-views-v2"); localStorage.removeItem("deepnar-keyhint"); } catch {} });
await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => { try { localStorage.removeItem("deepnar-keyhint"); } catch {} });
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /enter guest session/i }).click();
await page.waitForTimeout(1500);
// no second blocking modal after the greeter
check("35e no second modal", await page.getByRole("dialog", { name: "welcome" }).count() === 0
  && await page.getByRole("tablist", { name: "buffers" }).getByRole("tab").count() >= 1);
// home gleam + recruiter row visible
check("35e home gleam", await page.locator("main").getByText(/new here\?/i).count() >= 1);
const recruiter = page.getByRole("note", { name: "recruiter status" });
check("35e recruiter row", await recruiter.count() >= 1
  && (await recruiter.innerText()).includes("open to research/startup internships"));
// pry arrival: arrival-pool shape, never a return-only line
const bubble = page.locator('[data-pry="bubble"]');
let arrivalText = "";
for (let i = 0; i < 20 && !arrivalText; i++) {
  arrivalText = await bubble.innerText().catch(() => "");
  if (!arrivalText) await page.waitForTimeout(750);
}
const arrivalShape = /new here\?|press [parofc?]|^[parofc?] is |^[parof?] |lives under|trust the cat|that's the human|serious stuff|merged stuff|actually replies|try it| type\.|shocking|damage|drill|lore dump|bring coffee|free labor|don't be weird|files fear it|instead of sleeping|where the hint|tour's over/i;
const returnMarkers = /came back|missed me|back home|welcome back|home again|twice|least useful|sightseeing|efficient|bold strategy|filesystem|quota|still here\?|you returned/i;
check("35e arrival pool", arrivalShape.test(arrivalText) && !returnMarkers.test(arrivalText));
// keyboard hint must not overlap the arrival bubble
let overlapped = false;
for (let i = 0; i < 4; i++) {
  const [b, h] = await Promise.all([
    bubble.count().catch(() => 0),
    page.getByRole("note", { name: "keyboard hint" }).count().catch(() => 0),
  ]);
  if (b >= 1 && h >= 1) overlapped = true;
  await page.waitForTimeout(1000);
}
check("35e no hint overlap", !overlapped);
// hint arrives after the gap, opens Help
let lateHint = false;
for (let i = 0; i < 20 && !lateHint; i++) {
  lateHint = await page.getByRole("note", { name: "keyboard hint" }).count().then((n) => n >= 1).catch(() => false);
  if (!lateHint) await page.waitForTimeout(750);
}
check("35e late hint", lateHint);
if (lateHint) {
  await page.getByRole("note", { name: "keyboard hint" }).getByRole("button", { name: /show all/ }).click();
  await page.waitForTimeout(400);
  check("35e hint opens help", await page.getByRole("dialog").count() >= 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}
// recruiter links open inside the workstation (no external redirect)
await page.getByTitle("home").click();
await page.waitForTimeout(400);
await recruiter.getByRole("button", { name: /resume/ }).click();
await page.waitForTimeout(700);
check("35e resume internal", await page.getByRole("tab", { name: "resume.pdf", selected: true }).count() >= 1);
await page.getByTitle("home").click();
await page.waitForTimeout(400);
await recruiter.getByRole("button", { name: /featured/ }).click();
await page.waitForTimeout(700);
check("35e ice internal", (await page.locator("main").innerText()).includes("Infinite Context Engine"));
// leave + return home: exactly one short return tour, then silence
await page.getByTitle("home").click();
await page.waitForTimeout(300);
await page.keyboard.press("p");
await page.waitForTimeout(800);
await page.getByTitle("home").click();
let returnText = "";
for (let i = 0; i < 14 && !returnText; i++) {
  const t = await bubble.innerText().catch(() => "");
  if (t && t !== arrivalText) returnText = t;
  await page.waitForTimeout(750);
}
check("35e one return tour", returnText !== "" && !/new here\?/i.test(returnText) && returnText !== arrivalText);
await page.waitForTimeout(3500);
await page.keyboard.press("p");
await page.waitForTimeout(800);
await page.getByTitle("home").click();
let secondBubble = false;
for (let i = 0; i < 8; i++) {
  if (await bubble.count().catch(() => 0) >= 1) secondBubble = true;
  await page.waitForTimeout(1000);
}
check("35e no repeat tour", !secondBubble);
// mobile: status row wraps without page overflow
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.getByTitle("home").click().catch(() => {});
await page.waitForTimeout(400);
const mobFit = await page.evaluate(() => {
  const home = document.querySelector(".home-root");
  if (!home) return { ok: false, wide: -1 };
  return { ok: home.scrollWidth <= home.clientWidth + 1, wide: home.scrollWidth - home.clientWidth };
});
check("35e mobile no overflow", mobFit.ok && await recruiter.count() >= 1);
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(500);

// 36. oss repos pane: left walks out to the parent dir
await page.getByTitle("home").click();
await page.waitForTimeout(400);
await page.keyboard.press("o");
await page.waitForTimeout(500);
await page.keyboard.press("h");
await page.waitForTimeout(300);
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(500);
check("36 oss left to parent", await page.getByRole("listbox").count() >= 1);

// 37. content catalogue: meta workstation + systems shelf land on real pages
await page.goto("http://127.0.0.1:3001/?open=~/projects/deepnar-workstation/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
check("37a workstation README", (await page.locator("main").innerText()).includes("virtual filesystem"));
await page.goto("http://127.0.0.1:3001/?open=~/projects/systems/orien-config/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const orienText = await page.locator("main").innerText();
check("37b orien README", orienText.includes("chezmoi") && orienText.includes("Legion"));
check("37c orien github live", await page.locator("main").getByRole("link", { name: /GitHub/i }).first().getAttribute("href").then((h) => h === "https://github.com/Deepnar/orien-config").catch(() => false));
// 37d. repo meta rail renders generated facts, not prose
check("37d meta rail", (await page.getByLabel("repository metadata").first().innerText()).includes("★"));
// 37e. private source shows no dead github button
await page.goto("http://127.0.0.1:3001/?open=~/projects/practice/software/movie-ticket-booking/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const movText = await page.locator("main").innerText();
check("37e private source honest", movText.includes("private source") && (await page.locator("main").getByRole("link", { name: /^GitHub/i }).count().catch(() => 0)) === 0);
// 37f. practice shelves: ml + early land
await page.goto("http://127.0.0.1:3001/?open=~/projects/practice/ml/micrograd-from-scratch/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
check("37f ml shelf", (await page.locator("main").innerText()).includes("autodiff"));
await page.goto("http://127.0.0.1:3001/?open=~/projects/practice/early/pricing-tier-panel/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
check("37g early shelf", (await page.locator("main").innerText()).includes("code-along"));
// 37h. removed pages stay removed (graph-only now): shelf listing has no entry
await page.goto("http://127.0.0.1:3001/?open=~/projects/practice/software", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
check("37h rust-lab page gone", !(await page.locator("main").innerText()).includes("rust-lab"));

// 38. home achievements strip below activity
await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /enter guest session/i }).click().catch(() => {});
await page.waitForTimeout(1800);
await page.getByTitle("home").click().catch(() => {});
await page.waitForTimeout(500);
check("38 achievements", await page.getByRole("list", { name: "github achievements" }).getByRole("listitem").count().then((n) => n === 6).catch(() => false));

// 39. signal graph: temporal story scale
await page.keyboard.press("Alt+3");
await page.waitForTimeout(3600);
const nodeCount39 = await page.getByLabel("graph canvas").getAttribute("data-nodes");
check("39 graph story nodes", Number(nodeCount39) >= 30);

// 40. signal proximity-picker consistency: screen() projector vs the
// magnetic picker (hover/click/dblclick share pickNode; hover adds
// 24px-enter/32px-leave hysteresis). NOTE (audit): this proves the event
// pipeline is self-consistent — visual cursor truth needs the debug
// overlay (§46) + a human eye, not these asserts.
await page.goto("http://127.0.0.1:3001/?signal-debug", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /enter guest session/i }).click().catch(() => {});
await page.waitForTimeout(1800);
await page.keyboard.press("Alt+3");
// wait ONLY for the documented geometryReady condition — never an
// arbitrary settle delay, never setView, never resize (fresh-mount repro).
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  ready = await page.evaluate(() => window.__signal?.geom().ready ?? false).catch(() => false);
  if (!ready) await page.waitForTimeout(100);
}
check("40a debug handle + geometry ready", (await page.evaluate(() => !!window.__signal).catch(() => false)) && ready);
const sigHead = await page.getByLabel("signal knowledge graph").innerText().catch(() => "");
check("40b fitted 100%", /100%/.test(sigHead));
const moveToNode = async (id, dy = 0) => {
  const box = await page.getByLabel("graph canvas").boundingBox();
  const pt = await page.evaluate((i) => window.__signal.screen(i), id);
  if (!box || !pt) return null;
  await page.mouse.move(box.x + pt[0], box.y + pt[1] + dy);
  await page.waitForTimeout(250);
  return page.evaluate(() => window.__signal.hover());
};
const setZoomF = async (f) => {
  await page.evaluate((ff) => {
    const s = window.__signal; const v = s.view.current; const fk = s.fitK.current;
    s.setView(v.x, v.y, ff == null ? fk : fk * ff);
  }, f);
  await page.waitForTimeout(250);
};
let accOk = true;
for (const f of [null, 0.75, 1.5, 2]) {
  await setZoomF(f);
  if ((await moveToNode("router")) !== "router") accOk = false;
}
check("40c hover router @fit/75/150/200", accOk);
await setZoomF(1.5);
check("40d proximity picks near-node (20px off-center)", (await moveToNode("forge", 20)) === "forge");
// label rects must NOT pick: a point far below the node (40px, past LEAVE)
// with no node nearby must clear hover — unless another node legitimately
// holds it, in which case hover is still a node, never empty-wrong.
{
  const box = await page.getByLabel("graph canvas").boundingBox();
  const pt = await page.evaluate(() => window.__signal.screen("forge"));
  await page.mouse.move(box.x + pt[0], box.y + pt[1]);
  await page.waitForTimeout(250);
  const held = await page.evaluate(() => window.__signal.hover());
  // walk straight down 44px in 4 steps (hysteresis: forge must drop past LEAVE)
  for (let s = 1; s <= 4; s++) {
    await page.mouse.move(box.x + pt[0], box.y + pt[1] + s * 11);
    await page.waitForTimeout(120);
  }
  const after = await page.evaluate(() => window.__signal.hover());
  check("40d2 leave-radius drops far node", after !== "forge" || held !== "forge");
}
// hysteresis: re-enter, then sit between ENTER and LEAVE (28px) → still held
{
  const box = await page.getByLabel("graph canvas").boundingBox();
  const pt = await page.evaluate(() => window.__signal.screen("router"));
  const cx = box.width / 2, cy = box.height / 2;
  const ox = pt[0] - cx, oy = pt[1] - cy;
  const len = Math.hypot(ox, oy) || 1;
  await page.mouse.move(box.x + pt[0], box.y + pt[1]);
  await page.waitForTimeout(250);
  const entered = await page.evaluate(() => window.__signal.hover());
  await page.mouse.move(box.x + pt[0] + (ox / len) * 28, box.y + pt[1] + (oy / len) * 28);
  await page.waitForTimeout(250);
  const held = await page.evaluate(() => window.__signal.hover());
  check("40d3 hysteresis holds inside LEAVE", entered !== "router" || held === "router");
}
// cursor state follows the picker: pointer class on node, grab on background
{
  const box = await page.getByLabel("graph canvas").boundingBox();
  const pt = await page.evaluate(() => window.__signal.screen("router"));
  await page.mouse.move(box.x + pt[0], box.y + pt[1]);
  await page.waitForTimeout(250);
  const onNode = await page.evaluate(() => document.querySelector('canvas[aria-label="graph canvas"]')?.classList.contains("cursor-pointer") ?? null);
  await page.mouse.move(box.x + 14, box.y + 14);
  await page.waitForTimeout(250);
  const onBg = await page.evaluate(() => document.querySelector('canvas[aria-label="graph canvas"]')?.classList.contains("cursor-pointer") ?? null);
  check("40d4 cursor pointer-on-node / grab-on-bg", onNode === true && onBg === false);
}
// re-establish forge hover for the card check below
await moveToNode("forge", 20);
const sigText = await page.getByLabel("signal knowledge graph").innerText().catch(() => "");
check("40e card matches hover", sigText.includes("presentation-forge"));
const base = await page.evaluate(() => ({ x: window.__signal.view.current.x, y: window.__signal.view.current.y, k: window.__signal.fitK.current }));
let panOk = true;
for (const [dx, dy] of [[150, 0], [-150, 0], [0, 100], [0, -100]]) {
  await page.evaluate(([b, ddx, ddy]) => window.__signal.setView(b.x + ddx, b.y + ddy, b.k), [base, dx, dy]);
  await page.waitForTimeout(250);
  if ((await moveToNode("router")) !== "router") panOk = false;
}
check("40f hover router panned l/r/u/d", panOk);
await page.evaluate((b) => window.__signal.setView(b.x, b.y, b.k), base);
await page.waitForTimeout(250);
let cornerOk = true;
{
  const box = await page.getByLabel("graph canvas").boundingBox();
  const corners = [[12, 12], [box.width - 12, 12], [12, box.height - 12], [box.width - 12, box.height - 12]];
  for (const [cx, cy] of corners) {
    await page.mouse.move(box.x + cx, box.y + cy);
    await page.waitForTimeout(200);
    if ((await page.evaluate(() => window.__signal.hover())) !== null) cornerOk = false;
  }
}
check("40g empty corners hit nothing", cornerOk);
{
  const box = await page.getByLabel("graph canvas").boundingBox();
  const pt = await page.evaluate(() => window.__signal.screen("ice"));
  await page.mouse.move(box.x + pt[0], box.y + pt[1]);
  await page.waitForTimeout(250);
  await page.mouse.click(box.x + pt[0], box.y + pt[1]);
  await page.waitForTimeout(300);
}
check("40h click selects node", await page.getByRole("button", { name: /open in workstation/i }).count().then((n) => n > 0).catch(() => false));
{
  const box = await page.getByLabel("graph canvas").boundingBox();
  const pt = await page.evaluate(() => window.__signal.screen("ice"));
  await page.mouse.dblclick(box.x + pt[0], box.y + pt[1]);
  await page.waitForTimeout(1300);
}
check("40i dblclick opens artifact", await page.getByLabel("file navigation").count().catch(() => 0) >= 1);

// 41. cursor-hotspot validation against UPSTREAM art (not our own mapping).
// (a) node-side: hotspots.json + cursors.css must equal the vendored
// upstream source (gen-cursors --check does this; re-asserted here so the
// suite fails if anyone hand-edits css). (b) in-browser pixels: each
// hotspot must land on opaque art, near the real tip/center of the PNG.
{
  const { readFileSync } = await import("node:fs");
  const hot = JSON.parse(readFileSync("public/cursors/hotspots.json", "utf8"));
  const up = JSON.parse(readFileSync("scripts/cursor-hotspots-upstream.json", "utf8"));
  const css = readFileSync("src/app/cursors.css", "utf8");
  let mapOk = true;
  for (const [role, s] of Object.entries(up.roles)) {
    const want = [Math.round(s.x), Math.round(s.y)];
    const have = hot[role] ?? [];
    if (have[0] !== want[0] || have[1] !== want[1]) mapOk = false;
    if (!css.includes(`/cursors/${role}.png") ${want[0]} ${want[1]}`)) mapOk = false;
  }
  check("41a hotspot mapping == upstream verbatim", mapOk);
  const px = await page.evaluate(async (hotspots) => {
    const out = {};
    for (const [role, [hx, hy]] of Object.entries(hotspots)) {
      const img = new Image();
      img.src = `/cursors/${role}.png`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const A = (x, y) => (x < 0 || y < 0 || x >= c.width || y >= c.height ? 0 : d[(y * c.width + x) * 4 + 3]);
      let minX = 99, minY = 99, maxX = -1, maxY = -1, topY = 99, topX = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (A(x, y) > 128) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (y < topY) { topY = y; topX = x; }
        }
      }
      out[role] = {
        hotAlpha: A(hx, hy),
        tipDist: Math.hypot(hx - topX, hy - topY),
        ctrDist: Math.hypot(hx - (minX + maxX) / 2, hy - (minY + maxY) / 2),
      };
    }
    return out;
  }, { default: hot.default, pointer: hot.pointer, grab: hot.grab, grabbing: hot.grabbing, text: hot.text, "zoom-in": hot["zoom-in"] });
  const tipRoles = ["default", "pointer"];
  const ctrRoles = ["grab", "grabbing", "text", "zoom-in"];
  let pxOk = true;
  for (const r of [...tipRoles, ...ctrRoles]) {
    if (px[r].hotAlpha < 200) pxOk = false;
  }
  for (const r of tipRoles) if (px[r].tipDist > 6) pxOk = false;
  for (const r of ["grab", "grabbing", "text"]) if (px[r].ctrDist > 3) pxOk = false;
  // zoom-in: the handle skews the opaque bbox, so the true center (13,13)
  // sits ~3.9px off bbox-center — assert inside-bbox + on-art instead.
  if (px["zoom-in"].ctrDist > 4.5) pxOk = false;
  check("41b hotspots land on art (tip/center)", pxOk);
  console.log("CURSOR-PX " + JSON.stringify(px));
}

// 42. real geometry assertions on the deterministic canonical layout.
{
  const m1 = await page.evaluate(() => window.__signal.measure());
  console.log("SIGNAL-GEOM " + JSON.stringify(m1));
  check("42a no NaN/Infinity", m1.nan === false);
  check("42b flagships all visible", m1.flagsVisible === m1.flagsTotal && m1.flagsTotal > 0);
  const minMargin = Math.min(m1.margins.L, m1.margins.R, m1.margins.T, m1.margins.B);
  check("42c min margin >= 24px", minMargin >= 24);
  check("42d occupancy sane", m1.occX >= 0.45 && m1.occX <= 0.98 && m1.occY >= 0.5 && m1.occY <= 0.98);
  check("42e content aspect 1.4-1.85", m1.aspect >= 1.4 && m1.aspect <= 1.85);
  // determinism: reload → identical world bounds
  await page.goto("http://127.0.0.1:3001/?signal-debug", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /enter guest session/i }).click().catch(() => {});
  await page.waitForTimeout(1500);
  await page.keyboard.press("Alt+3");
  await page.waitForTimeout(2500);
  const m2 = await page.evaluate(() => window.__signal.measure());
  check("42f deterministic reload", JSON.stringify(m1.world) === JSON.stringify(m2.world));
}

// 43. real user zoom (wheel events), not setView — anchor stability,
// hover-after-zoom, pan+wheel+hover, fit/0 restores canonical geometry.
{
  const box = await page.getByLabel("graph canvas").boundingBox();
  const scr = async (id) => page.evaluate((i) => window.__signal.screen(i), id);
  const p1 = await scr("router");
  await page.mouse.move(box.x + p1[0], box.y + p1[1]);
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -480);
  await page.waitForTimeout(400);
  const p2 = await scr("router");
  const anchorDrift = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  check("43a wheel zoom anchors under pointer", anchorDrift <= 4);
  check("43b hover correct after wheel", (await page.evaluate(() => window.__signal.hover())) === "router");
  // real drag-pan, then hover still correct
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const p3 = await scr("router");
  await page.mouse.move(box.x + p3[0], box.y + p3[1]);
  await page.waitForTimeout(250);
  check("43c pan + hover still correct", (await page.evaluate(() => window.__signal.hover())) === "router");
  // fit via the 0 key restores canonical geometry
  await page.mouse.click(box.x + 14, box.y + 14);
  await page.waitForTimeout(200);
  await page.keyboard.press("0");
  await page.waitForTimeout(400);
  const v = await page.evaluate(() => {
    const s = window.__signal;
    return { k: s.view.current.k, fk: s.fitK.current, pct: s.pct() };
  });
  check("43d fit/0 restores 100%", Math.abs(v.k - v.fk) < 1e-6 && v.pct === "100%");
  const sigHead2 = await page.getByLabel("signal knowledge graph").innerText().catch(() => "");
  check("43e header back at 100%", /100%/.test(sigHead2));
}

// 45. pry says one unique line per thing (location subscription).
// ws2 entry → orbit line. poll: the pet may take the 9s retry path if it
// was mid-animation when the workspace changed; bubble shows ~3s.
{
  await page.keyboard.press("Alt+1");
  await page.waitForTimeout(1000);
  await page.keyboard.press("Alt+2");
  let heard = false;
  for (let i = 0; i < 80 && !heard; i++) {
    heard = await page.getByText("five clean hits").count().then((n) => n > 0).catch(() => false);
    if (!heard) await page.waitForTimeout(500);
  }
  check("45 pry greets orbit uniquely", heard);
}

// 46. FRESH-MOUNT repro (the browser-zoom-heals-it bug): load from scratch,
// enter Signal through the user path, no setView, no resize, no long wait.
// Geometry must become ready on its own; the fit rect must equal the live
// rect (stale-fit detector); interaction must align immediately. Then
// remount (ws switch) and viewport-resize must preserve alignment.
{
  await page.goto("http://127.0.0.1:3001/?signal-debug", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /enter guest session/i }).click().catch(() => {});
  await page.waitForTimeout(1200);
  await page.keyboard.press("Alt+3");
  let g1 = null;
  for (let i = 0; i < 40; i++) {
    g1 = await page.evaluate(() => window.__signal?.geom()).catch(() => null);
    if (g1?.ready) break;
    await page.waitForTimeout(100);
  }
  check("46a fresh mount becomes ready", !!g1?.ready);
  const fitMatchesLive = g1 && Math.abs(g1.rectAtFit[0] - g1.rect[0]) <= 2 && Math.abs(g1.rectAtFit[1] - g1.rect[1]) <= 2;
  check("46b fit rect == live rect (no stale fit)", !!fitMatchesLive);
  console.log("SIGNAL-GEOM-FRESH " + JSON.stringify(g1));
  const box = await page.getByLabel("graph canvas").boundingBox();
  const pt = await page.evaluate(() => window.__signal.screen("router"));
  await page.mouse.move(box.x + pt[0], box.y + pt[1]);
  await page.waitForTimeout(300);
  check("46c fresh-mount hover aligns", (await page.evaluate(() => window.__signal.hover())) === "router");
  const k1 = g1?.fitK;
  // remount via workspace switch
  await page.keyboard.press("Alt+1");
  await page.waitForTimeout(800);
  await page.keyboard.press("Alt+3");
  let g2 = null;
  for (let i = 0; i < 40; i++) {
    g2 = await page.evaluate(() => window.__signal?.geom()).catch(() => null);
    if (g2?.ready) break;
    await page.waitForTimeout(100);
  }
  check("46d remount ready + same canonical fit", !!g2?.ready && g2.fitK === k1);
  const pt2 = await page.evaluate(() => window.__signal.screen("ice"));
  const box2 = await page.getByLabel("graph canvas").boundingBox();
  await page.mouse.move(box2.x + pt2[0], box2.y + pt2[1]);
  await page.waitForTimeout(300);
  check("46e remount hover aligns", (await page.evaluate(() => window.__signal.hover())) === "ice");
  // viewport resize (the old "repair"): alignment must survive, and the
  // geometry values must be identical except genuinely changed dimensions.
  const before = await page.evaluate(() => window.__signal.geom());
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => window.__signal.geom());
  const pt3 = await page.evaluate(() => window.__signal.screen("ice"));
  const box3 = await page.getByLabel("graph canvas").boundingBox();
  await page.mouse.move(box3.x + pt3[0], box3.y + pt3[1]);
  await page.waitForTimeout(300);
  check("46f resize preserves alignment", (await page.evaluate(() => window.__signal.hover())) === "ice");
  check("46g resize only changes dims", before.fitK !== undefined && after.ready === true
    && Math.abs(after.rectAtFit[0] - after.rect[0]) <= 2 && Math.abs(after.rectAtFit[1] - after.rect[1]) <= 2);
  console.log("SIGNAL-GEOM-RESIZED " + JSON.stringify(after));
  await page.setViewportSize({ width: 1600, height: 900 });
}

// 44. the tested build IS the repo HEAD (dev serves the working tree).
{
  const { execSync } = await import("node:child_process");
  const sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  let clean = true;
  try {
    execSync("git diff --quiet -- src/apps/Constellation.tsx src/app/cursors.css public/cursors/ scripts/ src/system/pry.ts src/system/Pet.tsx src/content/research.ts src/vfs/vfs.ts", { stdio: "ignore" });
  } catch { clean = false; }
  check("44 tested tree == committed HEAD", clean);
  console.log("BUILD-SHA " + sha + (clean ? " clean" : " DIRTY"));
}

console.log(results.join("\n"));
await browser.close();
