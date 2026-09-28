import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:3001/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1200);
await page.keyboard.press("Enter"); await page.waitForTimeout(2200);
try { await page.click("[aria-label='welcome'] button", { timeout: 3000 }); await page.waitForTimeout(400); } catch {}
await page.getByLabel("toggle file tree").click(); await page.waitForTimeout(800);
await page.getByLabel("toggle file tree").click(); await page.waitForTimeout(1200);
const ls = await page.evaluate(() => localStorage.getItem("deepnar-ws-layout"));
console.log("layout-saved:", ls);
await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(1500);
const per = await page.getByLabel("file explorer").boundingBox().then((b) => b?.width ?? 0).catch(() => 0);
console.log("after-reload:", Math.round(per));
await browser.close();
