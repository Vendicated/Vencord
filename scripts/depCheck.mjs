/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { createInterface } from "readline/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PackageJSON = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));

const allDeps = { ...PackageJSON.dependencies, ...PackageJSON.devDependencies };
const requiredDeps = Object.keys(allDeps);
const missing = requiredDeps.filter(d => {
    const v = allDeps[d];
    return !v.startsWith("link:") && !v.startsWith("workspace:") && !existsSync(join(root, "node_modules", d, "package.json"));
});

if (missing.length) {
    console.error(`\x1b[31mMissing ${missing.length} package(s): ${missing.join(", ")}\x1b[0m`);
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    rl.on("SIGINT", () => { rl.close(); process.exit(1); });
    try {
        const ans = await rl.question("\x1b[33mRun 'pnpm install'? [Y/n]: \x1b[0m");
        if (!ans || /^y/i.test(ans)) execSync("pnpm install --frozen-lockfile", { cwd: root, stdio: "inherit" });
    } finally { rl.close(); }
} else {
    console.log("\x1b[32mAll dependencies are installed.\x1b[0m");
}
