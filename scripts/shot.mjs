// Interaction + screenshot harness. Drives the dev server, captures states.
import { chromium } from "playwright-core";

const DIR = "/home/deepnar/.hermes/cache/scratch";
const shots = [];
const shot = async (page, name) => {
  const p = `${DIR}/pf-${name}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
};

const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// Force canonical dark theme deterministically (harness Chrome defaults to light).
await page.addInitScript(() => localStorage.setItem("deepnar-theme", "dark"));
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

// 1. boot overlay (immediately)
await page.waitForTimeout(300);
await shot(page, "1-boot");

// 2. home after boot
await page.waitForTimeout(2500);
await shot(page, "2-home");

// 3. run terminal commands
const term = page.getByLabel("terminal input");
await term.click();
await term.fill("neofetch");
await term.press("Enter");
await page.waitForTimeout(400);
await term.fill("open ice");
await term.press("Enter");
await page.waitForTimeout(600);
await shot(page, "3-project-ice");

// 4. research workspace via key (blur terminal first so keys reach the shell)
await page.locator("main").click();
await page.keyboard.press("3");
await page.waitForTimeout(500);
await shot(page, "4-research");

// 5. oss
await page.keyboard.press("4");
await page.waitForTimeout(500);
await shot(page, "5-oss");

// 6. palette
await page.keyboard.press("Control+k");
await page.waitForTimeout(400);
await shot(page, "6-palette");

// close palette, light theme via terminal
await page.keyboard.press("Escape");
await term.click();
await term.fill("theme light");
await term.press("Enter");
await page.waitForTimeout(600);
await shot(page, "7-light");

// 7. assistant: blur terminal, open ai pane, ask
await page.keyboard.press("Escape");
await page.locator("main").click();
await page.waitForTimeout(200);
await page.keyboard.press("/");
await page.waitForTimeout(300);
const ask = page.getByLabel("ask assistant").first();
await ask.fill("why did you build ICE?");
await ask.press("Enter");
await page.waitForTimeout(1500);
await shot(page, "8-assistant");

// 9. mobile viewport home (close AI overlay first, then blur + go home)
await page.setViewportSize({ width: 390, height: 844 });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.locator("main").click({ position: { x: 20, y: 20 } });
await page.keyboard.press("1");
await page.waitForTimeout(600);
await shot(page, "9-mobile");

console.log("SHOTS:\n" + shots.join("\n"));
await browser.close();
