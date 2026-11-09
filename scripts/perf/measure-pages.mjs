/**
 * Page weight + layout-shift measurement in headless Chrome (SEO phase 4).
 *
 *   node scripts/perf/measure-pages.mjs --base=https://technohouse.com.bd
 *   node scripts/perf/measure-pages.mjs --base=http://127.0.0.1:3200 --paths=/,/category/laptop
 *   node scripts/perf/measure-pages.mjs --base=… --json=out.json
 *   node scripts/perf/measure-pages.mjs --base=… --throttle --profiles=mobile   # slow 4G
 *
 * Per page, mobile (412×823, 4× CPU slowdown — Lighthouse-like) and desktop:
 *   - CLS: layout-shift entries during load, grouped into session windows the
 *     way Core Web Vitals does (max 5 s window, 1 s gap); "scroll CLS" adds a
 *     slow scroll to the bottom, which is when lazy images arrive.
 *   - HTML: bytes of the document (decoded) and over the wire.
 *   - images: count and bytes over the wire, at load and after the scroll.
 * Needs Chrome (C:/Program Files/Google/Chrome/Application/chrome.exe, or
 * CHROME_PATH) and puppeteer-core (already in node_modules). Reads only.
 */
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const arg = (name, fallback) =>
  process.argv.find((v) => v.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

const BASE = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const PATHS = arg("paths", "/,/category/laptop,/product/msi-b650m-project-zero")
  .split(",")
  .map((p) => (p.startsWith("/") ? p : `/${p}`));
const RUNS = Number(arg("runs", "3"));
// --throttle: Lighthouse mobile network (150 ms RTT, 1.6 Mbps down) on the
// mobile profile — late images/fonts are what cause shifts on real phones.
const THROTTLE = process.argv.includes("--throttle");
const PROFILE_NAMES = (arg("profiles", "mobile,desktop")).split(",");
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const PROFILES = {
  mobile: {
    viewport: { width: 412, height: 823, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true },
    ua: "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    cpu: 4,
  },
  desktop: {
    viewport: { width: 1366, height: 900, deviceScaleFactor: 1 },
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    cpu: 1,
  },
};

const CLS_OBSERVER = `
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.hadRecentInput) window.__shifts.push({ t: e.startTime, v: e.value,
        nodes: (e.sources || []).map((s) => s.node && s.node.nodeName ? (s.node.nodeName + (s.node.id ? '#' + s.node.id : '') + (s.node.className && typeof s.node.className === 'string' ? '.' + s.node.className.split(' ').slice(0, 3).join('.') : '')) : '?') });
    }
  }).observe({ type: "layout-shift", buffered: true });
`;

function sessionCls(shifts) {
  let max = 0;
  let cur = 0;
  let start = -1;
  let last = -1;
  for (const s of shifts) {
    if (start < 0 || s.t - last > 1000 || s.t - start > 5000) {
      cur = 0;
      start = s.t;
    }
    cur += s.v;
    last = s.t;
    max = Math.max(max, cur);
  }
  return max;
}

async function measure(browser, path, profileName) {
  const profile = PROFILES[profileName];
  const page = await browser.newPage();
  await page.setViewport(profile.viewport);
  await page.setUserAgent(profile.ua);
  await page.setCacheEnabled(false);
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  if (THROTTLE && profileName === "mobile") {
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
  }
  const requests = new Map();
  let phase = "load";
  cdp.on("Network.responseReceived", (e) => {
    requests.set(e.requestId, { type: e.type, url: e.response.url, phase, bytes: 0 });
  });
  cdp.on("Network.loadingFinished", (e) => {
    const r = requests.get(e.requestId);
    if (r) r.bytes = e.encodedDataLength;
  });
  await page.evaluateOnNewDocument(CLS_OBSERVER);
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 240000 });
  const html = await response.text();
  await new Promise((r) => setTimeout(r, 2500));
  const loadShifts = await page.evaluate(() => window.__shifts.slice());
  phase = "scroll";
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
  });
  await new Promise((r) => setTimeout(r, 2000));
  const allShifts = await page.evaluate(() => window.__shifts.slice());
  const doc = [...requests.values()].find((r) => r.type === "Document");
  const images = [...requests.values()].filter((r) => r.type === "Image");
  const sum = (list) => list.reduce((a, r) => a + r.bytes, 0);
  const loadImages = images.filter((r) => r.phase === "load");
  await page.close();
  const worst = [...loadShifts].sort((a, b) => b.v - a.v).slice(0, 3);
  return {
    status: response.status(),
    cls: sessionCls(loadShifts),
    clsScroll: sessionCls(allShifts),
    htmlBytes: Buffer.byteLength(html),
    htmlWire: doc?.bytes ?? 0,
    imagesAtLoad: loadImages.length,
    imageBytesAtLoad: sum(loadImages),
    imagesTotal: images.length,
    imageBytesTotal: sum(images),
    worstShifts: worst.map((s) => `${s.v.toFixed(4)} ${s.nodes.join(",")}`),
  };
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const results = {};
for (const path of PATHS) {
  for (const profile of PROFILE_NAMES) {
    const runs = [];
    for (let i = 0; i < RUNS; i += 1) runs.push(await measure(browser, path, profile));
    const pick = (key) => median(runs.map((r) => r[key]));
    const row = {
      status: runs[0].status,
      cls: pick("cls"),
      clsScroll: pick("clsScroll"),
      htmlBytes: pick("htmlBytes"),
      htmlWire: pick("htmlWire"),
      imagesAtLoad: pick("imagesAtLoad"),
      imageBytesAtLoad: pick("imageBytesAtLoad"),
      imagesTotal: pick("imagesTotal"),
      imageBytesTotal: pick("imageBytesTotal"),
      worstShifts: runs.sort((a, b) => b.cls - a.cls)[0].worstShifts,
    };
    results[`${path} [${profile}]`] = row;
    console.log(
      `${path.padEnd(40)} ${profile.padEnd(7)} ${row.status} CLS ${row.cls.toFixed(3)} (scroll ${row.clsScroll.toFixed(3)}) | HTML ${kb(row.htmlBytes)} (wire ${kb(row.htmlWire)}) | images at load ${row.imagesAtLoad} / ${kb(row.imageBytesAtLoad)}, after scroll ${row.imagesTotal} / ${kb(row.imageBytesTotal)}`,
    );
    if (row.cls > 0.01) console.log(`    worst shifts: ${row.worstShifts.join(" | ")}`);
  }
}
await browser.close();
const out = arg("json");
if (out) writeFileSync(out, JSON.stringify({ base: BASE, runs: RUNS, results }, null, 2));
