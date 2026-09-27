// Interaction-consistency assertions: one VFS, many doors, same truth.
import { chromium } from "playwright-core";

const results = [];
const check = (name, cond) => {
  results.push(`${cond ? "PASS" : "FAIL"} ${name}`);
  if (!cond) process.exitCode = 1;
};

const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { localStorage.setItem("deepnar-theme", "dark"); localStorage.setItem("deepnar-seen", "1"); localStorage.setItem("deepnar-onboard", "1"); } catch { /* noop */ } });
page.on("pageerror", (e) => { results.push(`PAGEERROR ${String(e).slice(0, 120)}`); process.exitCode = 1; });
await page.goto("http://127.0.0.1:3001/?open=~/projects/ice/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);

// 1. deep link opened the buffer, statusline matches
check("deeplink buffer", await page.getByRole("tab", { name: /README\.md/ }).count() >= 1);
const status = await page.getByLabel("status").innerText();
check("statusline shows ice cwd", status.includes("~/projects/ice"));

// 2. terminal pwd matches statusline
const term = page.getByLabel("terminal input");
await term.click();
await term.fill("pwd");
await term.press("Enter");
await page.waitForTimeout(300);
const log = await page.getByLabel("terminal output").innerText();
check("pwd matches statusline", log.includes("~/projects/ice"));

// 3. cat README.md == open buffer content (same node)
await term.fill("cat README.md");
await term.press("Enter");
await page.waitForTimeout(300);
const log2 = await page.getByLabel("terminal output").innerText();
const main = await page.locator("main").innerText();
check("cat matches buffer", log2.includes("Infinite Context Engine") && main.includes("Infinite Context Engine"));

// 4. palette find → same node
await page.locator("main").click();
await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
await page.getByLabel("finder input").fill("evaluation.log");
await page.waitForTimeout(300);
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
const main2 = await page.locator("main").innerText();
check("palette opens evaluation.log", main2.includes("1,985") || main2.includes("turns"));

// 5. :bnext/:bd buffer cycle
await term.click();
await term.fill(":bd");
await term.press("Enter");
await page.waitForTimeout(300);
check(":bd closes buffer", (await page.locator("main").innerText()).includes("controlled-eval") === false);

// 6. home quick action key
await page.locator("main").click();
await page.keyboard.press("1");
await page.waitForTimeout(400);
await page.keyboard.press("p");
await page.waitForTimeout(400);
const main3 = await page.locator("main").innerText();
check("p → projects", main3.includes("architecture.md") && main3.includes("NAME"));

// 7. assistant ctx reflects cwd
await page.keyboard.press("/");
await page.waitForTimeout(400);
const ctx = await page.getByLabel("assistant pane").innerText();
check("assistant ctx is projects", ctx.includes("~/projects"));

// 8. theme command flips root theme
await page.keyboard.press("Escape");
await term.click();
await term.fill("theme light");
await term.press("Enter");
await page.waitForTimeout(400);
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
check("theme light applied", theme === "light");

console.log(results.join("\n"));
await browser.close();
