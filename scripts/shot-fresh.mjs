// Fresh-profile checks: mobile first paint + boot overlay.
import { chromium } from "playwright-core";

const DIR = "/home/deepnar/.hermes/cache/scratch";
const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });

// boot overlay on fresh desktop load
const p1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await p1.addInitScript(() => localStorage.setItem("deepnar-theme", "dark"));
await p1.goto("http://localhost:3001/", { waitUntil: "domcontentloaded" });
await p1.waitForTimeout(350);
await p1.screenshot({ path: `${DIR}/pf-0-boot.png` });
await p1.waitForTimeout(2500);
const bootGone = await p1.locator("text=$ boot deepnar").count();
console.log("boot overlay visible after 2.8s (expect 0):", bootGone);
await p1.close();

// fresh mobile load: terminal should start closed
const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await p2.goto("http://localhost:3001/", { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(2800);
await p2.screenshot({ path: `${DIR}/pf-9-mobile-fresh.png` });
const termVisible = await p2.locator('section[aria-label="terminal"]').count();
console.log("terminal visible on fresh mobile load (expect 0):", termVisible);
await browser.close();
