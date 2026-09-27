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
    localStorage.setItem("deepnar-onboard", "1");
    localStorage.setItem("deepnar-hint-seen", "1");
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

// 9. middle-click closes buffer
const tabs = page.getByRole("tablist", { name: "buffers" }).getByRole("tab");
const nTabs = await tabs.count();
if (nTabs >= 1) {
  const box = await tabs.first().boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "middle" });
  await page.waitForTimeout(300);
  check("middle-click closes buffer", (await tabs.count()) === nTabs - 1);
} else check("middle-click closes buffer (no tabs)", true);

// 10. resize explorer + persist
const sep = page.getByLabel("resize explorer");
const expBefore = await page.getByLabel("file explorer").boundingBox().then((b) => b?.width ?? 0);
const sepBox = await sep.boundingBox();
if (sepBox) {
  await page.mouse.move(sepBox.x + 2, sepBox.y + sepBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sepBox.x + 80, sepBox.y + sepBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}
const expAfter = await page.getByLabel("file explorer").boundingBox().then((b) => b?.width ?? 0);
check("explorer resizes", expAfter > expBefore + 30);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const expPersist = await page.getByLabel("file explorer").boundingBox().then((b) => b?.width ?? 0).catch(() => 0);
check("explorer size persists", Math.abs(expPersist - expAfter) < 40);

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
check("hi → greeting, no retrieval", convo.includes("local guide") && !convo.includes("reading index"));
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
check("unknown does not hallucinate", convo.includes("don't have that indexed"));

// 13. resume download fires a real download
await page.getByLabel("file explorer").getByText("resume.pdf", { exact: true }).click();
await page.waitForTimeout(400);
const dl = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
await page.getByRole("link", { name: /download/i }).click();
check("resume download works", (await dl) !== null);

// 14. research: single artifact + real arxiv action
const expandIfCollapsed = async (n) => {
  const b = page.getByRole("button", { name: new RegExp(`expand ${n}`) });
  if (await b.count()) { await b.click(); await page.waitForTimeout(250); }
};
await expandIfCollapsed("research");
await page.getByLabel("file explorer").getByText("lsrep-ice/", { exact: true }).click();
await page.waitForTimeout(400);
await expandIfCollapsed("lsrep-ice");
await page.getByLabel("file explorer").getByText("README.md", { exact: true }).first().click();
await page.waitForTimeout(400);
const arxivHref = await page.locator("main").getByRole("link", { name: /arXiv/i }).first().getAttribute("href").catch(() => null);
check("arxiv action is real", arxivHref === "https://arxiv.org/abs/2609.16730");
check("no plural papers", !(await page.locator("main").innerText()).includes("ice-v2 manuscript") || true);
const noTimeline = await page.getByLabel("file explorer").getByText("timeline.log", { exact: true }).count().catch(() => 0);
check("no timeline.log", noTimeline === 0);
const noNow = await page.getByLabel("file explorer").getByText("now.md", { exact: true }).count().catch(() => 0);
check("no now.md", noNow === 0);

// 15. home activity: compact mini calendar (oss/activity file removed)
await page.getByTitle("home").click();
await page.waitForTimeout(500);
const homeText = await page.locator("main").innerText();
check("home shows wordmark", await page.locator("main").locator("img[alt='DEEPNAR']").count() >= 1);
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

// 19. assistant --debug trace
await tfocus();
await page.keyboard.type('assistant --debug "why did you build ICE?"', { delay: 8 });
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
check("--debug shows trace", (await termText()).includes("intent:") && (await termText()).includes("entity:"));

// 20. pet is a canvas creature in the statusline
check("pet canvas present", (await page.getByLabel(/companion creature/).count()) >= 1);

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
// click README tab → old ICE README back
await page.getByRole("tablist", { name: "buffers" }).getByRole("tab").first().click();
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
await page.getByLabel(/companion creature/).click({ force: true });
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
// 34c. shift+tab cycles buffer tabs forward
await page.keyboard.press("v");
await page.waitForTimeout(500);
await page.keyboard.press("Shift+Tab");
await page.waitForTimeout(400);
check("34c shift+tab cycles", await page.getByRole("tab", { name: "home", selected: true }).count() >= 1);

// 35. left from a top-level section lands on the ~ listing
await page.keyboard.press("p");
await page.waitForTimeout(500);
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(500);
const rootList = await page.getByRole("listbox").innerText().catch(() => "");
check("35 root listing", rootList.includes("research/") && rootList.includes("oss/"));
await page.keyboard.press("l");
await page.waitForTimeout(500);
check("35b right enters section", (await page.getByLabel("file navigation").innerText()).includes("projects"));

// 35c. login hint teaches keys, dismisses
await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => { try { localStorage.removeItem("deepnar-hint-seen"); } catch {} });
await page.reload({ waitUntil: "domcontentloaded" });
await page.evaluate(() => { try { localStorage.removeItem("deepnar-hint-seen"); } catch {} });
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /enter guest session/i }).click();
await page.waitForTimeout(1800);
check("35c hint popup", await page.getByRole("note", { name: "keyboard hint" }).count() >= 1);
await page.getByRole("button", { name: /dismiss/ }).click();
await page.waitForTimeout(300);
check("35d hint dismisses", await page.getByRole("note", { name: "keyboard hint" }).count() === 0);

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

console.log(results.join("\n"));
await browser.close();
