// Bundle sanity gate (Phase 5 / R1).
// Fails the release build if code-splitting regresses or a chunk balloons.
// Run with: npm run check:bundle  (after `npm run build`)
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const dir = path.resolve("dist/assets");
const assets = readdirSync(dir).filter((f) => f.endsWith(".js"));
if (assets.length < 15) {
  console.error(`\n[BUNDLE GATE] Only ${assets.length} JS assets — code-splitting regressed (expect >= 15 lazy/vendor chunks).`);
  process.exit(1);
}

const sizes = assets.map((f) => {
  const raw = readFileSync(path.join(dir, f)).length;
  return { file: f, rawKb: Math.round(raw / 100) / 10, gzipKb: Math.round(gzipSync(readFileSync(path.join(dir, f))).length / 100) / 10 };
});

const entry = sizes.find((s) => s.file.startsWith("index-"));
const largest = sizes.reduce((a, b) => (a.rawKb > b.rawKb ? a : b));
const over500 = sizes.filter((s) => s.rawKb > 500).map((s) => `${s.file} (${s.rawKb} kB raw)`);

let problems = 0;
if (entry && entry.gzipKb > 100) {
  console.error(`\n[BUNDLE GATE] Entry chunk "${entry.file}" is ${entry.gzipKb} kB gzip (> 100 kB core).`);
  problems++;
}

// firebase + chart.js are heavyweight vendor deps; anything else over 500 kB is a regression.
const nonVendorOver500 = over500.filter((f) => !/vendor-(firebase|charts)/.test(f));
if (nonVendorOver500.length) {
  console.error(`\n[BUNDLE GATE] Non-vendor chunks over 500 kB raw: ${nonVendorOver500.join(", ")}`);
  problems++;
}

if (problems) {
  console.error("Bundle gate FAILED — run `npm run build` and review chunk splits.");
  process.exit(1);
}

console.log("\n[BUNDLE GATE] OK");
console.log(`  assets: ${assets.length} JS chunks`);
console.log(`  entry:  ${entry.file} (${entry.rawKb} kB raw / ${entry.gzipKb} kB gzip)`);
console.log(`  largest:${largest.file} (${largest.rawKb} kB raw)`);
console.log(`  vendors: vendor-react ${sizes.find((s) => s.file.startsWith("vendor-react"))?.gzipKb ?? "?"} kB gzip, vendor-firebase ${sizes.find((s) => s.file.startsWith("vendor-firebase"))?.gzipKb ?? "?"} kB gzip`);