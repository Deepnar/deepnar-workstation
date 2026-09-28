// Touch/mobile/tablet suite — real touch contexts (isMobile/hasTouch), NOT a
// resized mouse browser. Complements scripts/test-v3.mjs (desktop canonical).
// Usage: node scripts/test-touch.mjs  (needs dev on :3001)
import { chromium } from "playwright-core";

const BASE = "http://127.0.0.1:3001";
let pass = 0, fail = 0;
const check = (name, ok) => {
  if (ok) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name}`); }
};

async function enter(page) {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2200);
  try { await page.click("[aria-label='welcome'] button", { timeout: 3000 }); await page.waitForTimeout(500); } catch {}
}

async function wide(page) {
  return page.evaluate(() => {
    const bad = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > window.innerWidth + 1 && r.left >= -1) bad.push(el.tagName + ":" + Math.round(r.width));
    });
    return bad.slice(0, 6);
  });
}

const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome", args: ["--no-sandbox"] });

// ── 1. phone touch context ──────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 100)));
  await enter(page);
  const media = await page.evaluate(() => ({
    hoverNone: matchMedia("(hover: none)").matches,
    coarse: matchMedia("(pointer: coarse)").matches,
  }));
  check("T1 touch media (hover:none, pointer:coarse)", media.hoverNone && media.coarse);
  // drawer → dir → file → auto-close + buffer revealed
  await page.click('[aria-label="toggle file tree"]');
  await page.waitForTimeout(600);
  check("T2 drawer opens", !!(await page.$('[role="dialog"][aria-label="files"]')));
  await page.click('[aria-label="expand about"]');
  await page.waitForTimeout(500);
  const stillOpen = !!(await page.$('[role="dialog"][aria-label="files"]'));
  await page.screenshot({ path: "/tmp/t-phone-drawer.png" });
  // tap the first file button inside about/ (files are buttons, dirs treeitems)
  const fileBtn = await page.$('[role="dialog"][aria-label="files"] button:not([aria-label^="collapse"]):not([aria-label^="expand"]):not([aria-label^="close"])');
  check("T3 dir nav keeps drawer open", stillOpen && !!fileBtn);
  if (fileBtn) await fileBtn.click();
  await page.waitForTimeout(900);
  const st = await page.evaluate(() => ({
    drawerGone: !document.querySelector('[role="dialog"][aria-label="files"]'),
    buf: document.querySelector('[aria-label="buffer tabs"]')?.textContent?.slice(0, 60) ?? "none",
    main: document.querySelector("#main")?.textContent?.length ?? 0,
  }));
  check("T4 file tap closes drawer + reveals buffer", st.drawerGone && st.main > 200);
  check("T5 no page overflow 390", (await wide(page)).length === 0);
  check("T6 no page errors phone", errs.length === 0);
  await ctx.close();
}

// ── 2. orbit touch controls ─────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 100)));
  await page.goto(BASE + "/?orbit-debug", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.keyboard.press("Enter"); await page.waitForTimeout(2200);
  try { await page.click("[aria-label='welcome'] button", { timeout: 3000 }); await page.waitForTimeout(400); } catch {}
  await page.keyboard.press("Alt+2");
  await page.waitForTimeout(4500); // countdown 3..2..1
  check("T7 orbit touch controls visible", !!(await page.$('[aria-label="thrust controls"]')) && !!(await page.$('[aria-label="brake"]')) && !!(await page.$('[aria-label="pause game"]')));
  // hold thrust-up via real CDP touch events
  const btn = await page.$('[aria-label="thrust up"]');
  const bb = await btn.boundingBox();
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 1 }] });
  await page.waitForTimeout(700);
  const keys = await page.evaluate(() => window.__orbit?.keys() ?? null);
  const shipA = await page.evaluate(() => window.__orbit?.ship());
  await page.screenshot({ path: "/tmp/t-orbit-touch.png" });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(300);
  const keysAfter = await page.evaluate(() => window.__orbit?.keys() ?? null);
  check("T8 hold feeds keys (arrowup)", Array.isArray(keys) && keys.includes("arrowup"));
  check("T9 release clears keys", Array.isArray(keysAfter) && keysAfter.length === 0);
  check("T10 ship has velocity after thrust", shipA && Math.hypot(shipA.vx, shipA.vy) > 0.05);
  // pause button
  await page.tap('[aria-label="pause game"]');
  await page.waitForTimeout(400);
  check("T11 touch pause works", (await page.evaluate(() => window.__orbit?.paused())) === true);
  await page.tap('[aria-label="resume game"]');
  await page.waitForTimeout(300);
  check("T12 no page errors orbit", errs.length === 0);
  await ctx.close();
}

// ── 3. signal touch: tap select + pinch zoom ─────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 100)));
  await page.goto(BASE + "/?signal-debug", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.keyboard.press("Enter"); await page.waitForTimeout(2200);
  try { await page.click("[aria-label='welcome'] button", { timeout: 3000 }); await page.waitForTimeout(400); } catch {}
  await page.keyboard.press("Alt+3");
  await page.waitForTimeout(2500);
  const pt = await page.evaluate(() => {
    const cv = document.querySelector('[aria-label="graph canvas"]');
    const r = cv.getBoundingClientRect();
    const p = window.__signal?.screen("ice");
    return p ? [r.left + p[0], r.top + p[1]] : null;
  });
  check("T13 signal debug handle on touch", Array.isArray(pt));
  if (Array.isArray(pt)) {
    await page.touchscreen.tap(pt[0], pt[1]);
    await page.waitForTimeout(700);
  }
  const card = await page.evaluate(() => {
    const lists = [...document.querySelectorAll('[aria-label="signal knowledge graph"] button')];
    return { openBtn: lists.some((b) => /open in workstation|open successor/i.test(b.textContent || "")), sel: document.querySelector('[aria-label="signal knowledge graph"]')?.textContent?.includes("ice") ?? false };
  });
  check("T14 tap selects node + Open action", card.openBtn);
  await page.screenshot({ path: "/tmp/t-signal-touch.png" });
  // pinch out via CDP two-pointer touch
  const k0 = await page.evaluate(() => window.__signal?.pct());
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 150, y: 400, id: 1 }, { x: 240, y: 400, id: 2 }] });
  for (let i = 1; i <= 5; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 150 - i * 14, y: 400, id: 1 }, { x: 240 + i * 14, y: 400, id: 2 }] });
    await page.waitForTimeout(60);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400);
  const k1 = await page.evaluate(() => window.__signal?.pct());
  const px = (s) => parseFloat(s);
  check(`T15 pinch zoom changes view (${k0}→${k1})`, k0 && k1 && px(k1) > px(k0));
  check("T16 no page errors signal", errs.length === 0);
  await ctx.close();
}

// ── 4. sizes: 320 / 430 / landscape / tablet ─────────────
for (const [w, h, tag, touch] of [[320, 568, "s320", true], [430, 932, "s430", true], [844, 390, "land", true], [768, 1024, "tab", false], [820, 1180, "tab2", false]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 100)));
  await enter(page);
  await page.waitForTimeout(800);
  const wv = await wide(page);
  check(`T17 no overflow ${tag}`, wv.length === 0);
  check(`T18 no errors ${tag}`, errs.length === 0);
  if (tag === "s320") await page.screenshot({ path: "/tmp/t-s320-home.png" });
  if (tag === "land") {
    await page.keyboard.press("Alt+2");
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "/tmp/t-orbit-land.png" });
    const wv2 = await wide(page);
    check("T19 no overflow orbit landscape", wv2.length === 0);
  }
  await ctx.close();
}

// ── 5. agent + terminal sheets ───────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 100)));
  await enter(page);
  await page.click('[aria-label="toggle utility dock"]');
  await page.waitForTimeout(700);
  check("T20 dock sheet opens", !!(await page.$('[role="dialog"][aria-label="utility dock"]')));
  await page.click('text=new terminal');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/t-terminal-sheet.png" });
  const termVisible = await page.evaluate(() => (document.querySelector('[aria-label="utility dock"]')?.textContent?.length ?? 0) > 50);
  check("T21 terminal session in sheet", termVisible);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check("T22 sheet escape closes", !(await page.$('[role="dialog"][aria-label="utility dock"]')));
  check("T23 no errors sheets", errs.length === 0);
  await ctx.close();
}

// ── 6. 404 mobile ────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + "/nope-mobile", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1000);
  const ok = await page.evaluate(() => ({ pry: !!document.querySelector("canvas"), link: !!document.querySelector('a[href="/"]') }));
  check("T24 404 mobile pry + entry", ok.pry && ok.link);
  await ctx.close();
}

await browser.close();
console.log(`\nTOUCH: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
