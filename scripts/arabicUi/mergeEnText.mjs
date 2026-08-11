/**
 * Merge en-text/*.json → _all.json. Do not edit _all.json by hand.
 * Also writes locales/meta.json englishPhrases from the merge count.
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(__dirname, "..", "..", "src", "plugins", "arabicUi");
const dir = join(pluginRoot, "locales", "discord", "en-text");
const metaPath = join(pluginRoot, "locales", "meta.json");
const allowPath = join(pluginRoot, "engine", "chromeAllowlist.json");

const ALLOW_CHROME_SINGLE = new Set(JSON.parse(readFileSync(allowPath, "utf8")));

function isSafeKey(english) {
    const n = english.trim();
    if (n.length < 2) return false;
    const words = n.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return true;
    // Single words: allowlist only (avoids translating role names like Administrator)
    return ALLOW_CHROME_SINGLE.has(n);
}

const merged = new Map();
/** @type {Map<string, string>} */
const sourceFile = new Map();
const warnings = [];
let files = 0;
let skipped = 0;

const shardFiles = readdirSync(dir)
    .filter(x => x.endsWith(".json") && x !== "_all.json" && !x.startsWith("_"))
    .sort((a, b) => {
        const ae = a.startsWith("extras_") ? 1 : 0;
        const be = b.startsWith("extras_") ? 1 : 0;
        if (ae !== be) return ae - be;
        return a.localeCompare(b);
    });

for (const f of shardFiles) {
    files++;
    const obj = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v !== "string" || !k.length) continue;
        if (!isSafeKey(k)) {
            skipped++;
            continue;
        }
        if (merged.has(k) && merged.get(k) !== v) {
            warnings.push({
                key: k,
                kept: { file: sourceFile.get(k), value: merged.get(k) },
                ignored: { file: f, value: v },
            });
            continue;
        }
        if (!merged.has(k)) {
            merged.set(k, v);
            sourceFile.set(k, f);
        }
    }
}

const out = Object.fromEntries([...merged.entries()].sort((a, b) => a[0].localeCompare(b[0])));
const outPath = join(dir, "_all.json");
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
writeFileSync(metaPath, JSON.stringify({ englishPhrases: merged.size }, null, 2) + "\n", "utf8");

console.log(JSON.stringify({
    files,
    entries: merged.size,
    skippedShortKeys: skipped,
    duplicateConflictsIgnored: warnings.length,
    outPath,
    metaPath,
}, null, 2));

if (warnings.length) {
    console.error(`\n[warn] ${warnings.length} duplicate key(s) with different Arabic — run dedupeEnText.mjs`);
    for (const w of warnings.slice(0, 15))
        console.error(`  "${w.key}" kept ${w.kept.file} ignored ${w.ignored.file}`);
    if (warnings.length > 15)
        console.error(`  …and ${warnings.length - 15} more`);
}
