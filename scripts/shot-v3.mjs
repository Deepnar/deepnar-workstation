// V3 screenshot sweep → ~/.hermes/cache/scratch/v3-*.png
import { chromium } from "playwright-core";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DIR = process.env.TMPDIR || join(tmpdir(), "hermes-scratch");
const shots = [];
const shot = async (page, name) => {
  const p = `${DIR}/v3-${name}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
  console.log("shot", name);
};

const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => { try { localStorage.setItem("deepnar-theme", "dark"); localStorage.setItem("deepnar-seen", "1"); localStorage.setItem("deepnar-onboard", "1"); } catch {} });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

const dev = (() => {
  try {
    return JSON.parse(process.env.DEV_PROC || "null");
  } catch {
    return null;
  }
})();

const enterWs = async () => {
  await page.getByRole("button", { name: /enter guest session/i }).click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /open workstation/i }).click();
  await page.waitForTimeout(800);
};
const term = async (cmd) => {
  await page.locator("main").click();
  await page.keyboard.press("Control+`");
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-testid^="xterm-"]')];
    (els.find((e) => e.offsetParent !== null) ?? els[0])?.querySelector(".xterm-helper-textarea")?.focus();
  });
  await page.keyboard.type(cmd, { delay: 10 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
};
const ask = async (q) => {
  await page.locator("main").click();
  await page.waitForTimeout(200);
  await page.keyboard.press("/");
  await page.waitForTimeout(400);
  await page.getByLabel("agent input").fill(q);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
};

// 1-2. boot + greeter
await page.goto("http://127.0.0.1:3001/?boot=1", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(450);
await shot(page, "1-boot");
await page.waitForTimeout(1500);
await shot(page, "2-greeter");

// 3. desktop ws1
await page.getByRole("button", { name: /enter guest session/i }).click();
await page.waitForTimeout(600);
await shot(page, "3-desktop");

// 4. workstation home
await page.getByRole("button", { name: /open workstation/i }).click();
await page.waitForTimeout(800);
await shot(page, "4-home");

// 5-6. browser ice + ice buffer
await term("cd ~/projects/ice");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await shot(page, "5-browser");
await term("open README.md");
await page.waitForTimeout(500);
await shot(page, "6-buffer");

// 7. terminal neofetch
await term("neofetch");
await shot(page, "7-terminal");

// 8. two tabs
await page.getByLabel("new utility tab").click();
await page.waitForTimeout(300);
await page.getByRole("tablist", { name: "utility tabs" }).getByRole("button", { name: "new terminal" }).click();
await page.waitForTimeout(600);
await shot(page, "8-twotabs");

// 9. agent convo
await ask("hi");
await ask("what is ICE?");
await shot(page, "9-agent");

// 10-11. oss + calendar
await term(":bd");
await term("cd ~/oss");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await shot(page, "10-oss");
await term("open activity");
await page.waitForTimeout(500);
await shot(page, "11-calendar");

// 12. research
await term("open ~/research/lsrep-ice/README.md");
await page.waitForTimeout(500);
await shot(page, "12-research");

// 13. about
await term(":bd");
await term("open ~/about/README.md");
await page.waitForTimeout(500);
await shot(page, "13-about");

// 14-15. orbit + constellation
await page.keyboard.press("Alt+2");
await page.waitForTimeout(600);
await shot(page, "14-orbit");
await page.keyboard.press("Alt+3");
await page.waitForTimeout(600);
await shot(page, "15-signal");
await page.keyboard.press("Alt+1");
await page.waitForTimeout(400);

// 16. light theme
await page.evaluate(() => { try { localStorage.setItem("deepnar-theme", "light"); } catch {} });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1800);
await shot(page, "16-light");

// 17. mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:3001/?open=~/projects/ice/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1800);
await shot(page, "17-mobile");

console.log("pageerrors:", errors.length ? errors : "none");
await browser.close();
