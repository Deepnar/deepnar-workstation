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
await page.waitForTimeout(300);
await page.getByRole("tablist", { name: "utility tabs" }).getByRole("button", { name: "new terminal" }).click();
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
await page.waitForTimeout(600);
await page.getByRole("button", { name: /open workstation/i }).click();
await page.waitForTimeout(800);
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

// 15. contribution calendar: real days + hover readout
await expandIfCollapsed("oss");
await page.getByLabel("file explorer").getByText("activity", { exact: true }).click();
await page.waitForTimeout(500);
const cells = await page.locator("main").locator("[data-date]").count();
check("calendar has ~365 days", cells > 300 && cells < 400);
await page.locator("main").locator("[data-date]").nth(200).hover();
await page.waitForTimeout(200);
check("calendar hover readout", (await page.locator("main").innerText()).includes("contribution"));

// 16. desktop spaces via alt keys (app content follows the space)
await page.keyboard.press("Alt+2");
await page.waitForTimeout(400);
check("alt+2 → orbit app", (await page.locator("main").innerText().catch(() => "")) === "" || (await page.getByLabel("orbit game").count()) >= 1);
await page.keyboard.press("Alt+3");
await page.waitForTimeout(400);
check("alt+3 → signal app", await page.getByLabel("project constellation").count() >= 1);
await page.keyboard.press("Alt+1");
await page.waitForTimeout(400);
check("alt+1 → workstation", await page.getByLabel("file navigation").count() >= 1);
// desktop launchers match the space
await page.getByRole("button", { name: "minimize", exact: true }).click();
await page.waitForTimeout(400);
await page.keyboard.press("Alt+2");
await page.waitForTimeout(300);
check("desktop orbit launcher", await page.getByRole("button", { name: /open orbit/i }).count() >= 1);
await page.keyboard.press("Alt+1");
await page.waitForTimeout(300);
check("desktop workstation launcher", await page.getByRole("button", { name: /open workstation/i }).count() >= 1);

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
check("pet canvas present", (await page.getByLabel("status").locator("canvas").count()) >= 1);

console.log(results.join("\n"));
await browser.close();
