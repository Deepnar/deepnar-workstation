// V2 visual QA harness. Fresh profile → boot → greeter → desktop → app.
import { chromium } from "playwright-core";

const DIR = "/home/deepnar/.hermes/cache/scratch";
const shots = [];
const shot = async (page, name) => {
  const p = `${DIR}/v2-${name}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
};

const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { localStorage.setItem("deepnar-theme", "dark"); } catch { /* opaque origin */ } });
page.on("pageerror", (e) => console.log("PAGEERROR:", String((e.stack || e)).split("\n").slice(0, 8).join(" | ").slice(0, 600)));
await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });

// boot (immediate) → greeter
await page.waitForTimeout(400);
await shot(page, "1-boot");
await page.waitForTimeout(1800);
await shot(page, "2-greeter");

// enter → desktop
await page.getByRole("button", { name: /enter guest session/i }).click();
await page.waitForTimeout(700);
await shot(page, "3-desktop");

// open workstation → onboarding
await page.getByRole("button", { name: /open workstation/i }).click();
await page.waitForTimeout(700);
await shot(page, "4-onboard");
await page.getByRole("button", { name: /enter workstation/i }).click();
await page.waitForTimeout(500);
await shot(page, "5-home");

// terminal: neofetch + open ice
const term = page.getByLabel("terminal input");
await term.click();
await term.fill("neofetch");
await term.press("Enter");
await page.waitForTimeout(400);
await term.fill("open ~/projects/ice/README.md");
await term.press("Enter");
await page.waitForTimeout(600);
await shot(page, "6-ice-buffer");

// projects dir (close buffer first via :bd)
await term.fill(":bd");
await term.press("Enter");
await page.waitForTimeout(300);
await page.locator("main").click();
await page.keyboard.press("2");
await page.waitForTimeout(500);
await shot(page, "7-projects");

// research + oss + profile
for (const [key, name] of [["3", "8-research"], ["4", "9-oss"], ["5", "10-profile"]]) {
  await page.keyboard.press(key);
  await page.waitForTimeout(500);
  await shot(page, name);
}

// palette with query
await page.keyboard.press("Control+k");
await page.waitForTimeout(300);
await page.getByLabel("finder input").fill("ice");
await page.waitForTimeout(300);
await shot(page, "11-palette");
await page.keyboard.press("Escape");

// assistant ask
await page.keyboard.press("/");
await page.waitForTimeout(400);
await page.getByLabel("assistant input").fill("why did you build ICE?");
await page.getByLabel("assistant input").press("Enter");
await page.waitForTimeout(900);
await shot(page, "12-assistant");
await page.keyboard.press("Escape");

// overview
await page.keyboard.press("Control+k");
await page.waitForTimeout(200);
await page.getByLabel("finder input").fill("overview");
await page.waitForTimeout(200);
await page.keyboard.press("Enter");
await page.waitForTimeout(600);
await shot(page, "13-overview");
await page.keyboard.press("Escape");

// resume
await page.keyboard.press("5");
await page.waitForTimeout(400);
await term.click();
await term.fill("open ~/resume.pdf");
await term.press("Enter");
await page.waitForTimeout(800);
await shot(page, "14-resume");

// light theme app
await term.fill("theme light");
await term.press("Enter");
await page.waitForTimeout(600);
await shot(page, "15-light");

// mobile pass
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mob.addInitScript(() => { try { localStorage.setItem("deepnar-theme", "dark"); localStorage.setItem("deepnar-seen", "1"); localStorage.setItem("deepnar-onboard", "1"); } catch { /* opaque origin */ } });
mob.on("pageerror", (e) => console.log("MOB PAGEERROR:", String(e).slice(0, 300)));
await mob.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
await mob.waitForTimeout(2200);
await mob.getByRole("button", { name: /enter guest session/i }).click();
await mob.waitForTimeout(800);
await mob.screenshot({ path: `${DIR}/v2-16-mobile.png` });
shots.push(`${DIR}/v2-16-mobile.png`);

// deep link
await page.goto("http://127.0.0.1:3001/?open=~/projects/ice/README.md", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await shot(page, "17-deeplink");

console.log(shots.join("\n"));
await browser.close();
