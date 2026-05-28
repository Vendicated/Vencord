#!/usr/bin/env node
/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import "./checkNodeVersion.js";

import { execSync, spawn, spawnSync } from "child_process";
import {
    copyFileSync, existsSync, mkdirSync,
    readdirSync, readFileSync, renameSync,
    statSync, writeFileSync,
} from "fs";
import { createInterface } from "readline";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = join(BASE_DIR, "dist");

const DISCORD_VARIANTS = ["Discord", "DiscordCanary", "DiscordPTB", "DiscordDevelopment"];
const IGNORED_USERS = new Set(["All Users", "Default", "Default User", "Public", "desktop.ini"]);

// ── Path helpers ──────────────────────────────────────────────────────────────

function winPathToWsl(winPath) {
    return winPath
        .replace(/^([A-Za-z]):[\\\/]/, (_, d) => `/mnt/${d.toLowerCase()}/`)
        .replace(/\\/g, "/");
}

function wslPathToWin(wslPath) {
    return wslPath
        .replace(/^\/mnt\/([a-z])\//, (_, d) => `${d.toUpperCase()}:\\`)
        .replace(/\//g, "\\");
}

// ── ASAR helpers ──────────────────────────────────────────────────────────────

// Minimal ASAR writer — builds a valid asar archive from a { filename: string } map
function buildAsar(files) {
    const fileEntries = {};
    const chunks = [];
    let offset = 0;

    for (const [name, content] of Object.entries(files)) {
        const buf = Buffer.from(content, "utf-8");
        fileEntries[name] = { size: buf.byteLength, offset: String(offset) };
        chunks.push(buf);
        offset += buf.byteLength;
    }

    const headerJson = JSON.stringify({ files: fileEntries });
    const headerBuf = Buffer.from(headerJson, "utf-8");

    // Chromium Pickle format: [4-LE: 4][4-LE: headerBlockSize][4-LE: 4][4-LE: headerJsonLen][json]
    const headerJsonLen = headerBuf.byteLength;
    const headerBlockSize = 8 + headerJsonLen; // inner pickle (4+4+json)

    const header = Buffer.alloc(8 + 4 + 4 + headerJsonLen);
    header.writeUInt32LE(4, 0);                  // size of next field
    header.writeUInt32LE(headerBlockSize, 4);    // total header block size
    header.writeUInt32LE(4, 8);                  // size of next field
    header.writeUInt32LE(headerJsonLen, 12);     // json length
    headerBuf.copy(header, 16);

    return Buffer.concat([header, ...chunks]);
}

// Extract require() path from a raw ASAR buffer or directory index.js
function readRequireFromAsar(appAsarPath) {
    const st = statSync(appAsarPath);

    if (st.isDirectory()) {
        const indexJs = join(appAsarPath, "index.js");
        if (!existsSync(indexJs)) return null;
        return readRequireFromText(readFileSync(indexJs, "utf-8"));
    }

    // Binary ASAR: read as buffer, search for the require string
    const buf = readFileSync(appAsarPath);
    return readRequireFromText(buf.toString("latin1"));
}

function readRequireFromText(text) {
    const m = text.match(/require\("([^"]+patcher\.js)"\)/);
    return m ? m[1] : null;
}

// ── Discovery ─────────────────────────────────────────────────────────────────

function findWindowsUsers() {
    const usersDir = "/mnt/c/Users";
    if (!existsSync(usersDir)) throw new Error("Cannot access /mnt/c/Users — are you running under WSL?");
    return readdirSync(usersDir).filter(u => !IGNORED_USERS.has(u));
}

function scanInstalls(winUser) {
    const localAppData = `/mnt/c/Users/${winUser}/AppData/Local`;
    const results = [];

    for (const variant of DISCORD_VARIANTS) {
        const variantDir = join(localAppData, variant);
        if (!existsSync(variantDir)) continue;

        const appDirs = readdirSync(variantDir)
            .filter(d => /^app-\d/.test(d))
            .sort()
            .reverse(); // newest first

        for (const appDir of appDirs) {
            const resourcesDir = join(variantDir, appDir, "resources");
            if (!existsSync(resourcesDir)) continue;

            const appAsarPath = join(resourcesDir, "app.asar");
            if (!existsSync(appAsarPath)) continue;

            const exeName = variant + ".exe";
            const exeWsl = join(variantDir, appDir, exeName);
            const exeWin = wslPathToWin(exeWsl);

            // Check if already injected
            const patcherPath = readRequireFromAsar(appAsarPath);

            if (patcherPath) {
                const winDistPath = patcherPath.replace(/[\\\/]patcher\.js$/, "");
                const wslDistPath = winPathToWsl(winDistPath);
                results.push({
                    variant, appDir, winUser, resourcesDir,
                    appAsarPath, winDistPath, wslDistPath,
                    exeWin, exeName, injected: true,
                });
            } else {
                results.push({
                    variant, appDir, winUser, resourcesDir,
                    appAsarPath, winDistPath: null, wslDistPath: null,
                    exeWin, exeName, injected: false,
                });
            }
        }
    }

    return results;
}

// ── Interactive helpers ───────────────────────────────────────────────────────

function prompt(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function selectInstallation(installations) {
    if (installations.length === 1) {
        const inst = installations[0];
        const tag = inst.injected ? "" : " [not injected]";
        console.log(`Found 1 installation: ${inst.variant} (${inst.appDir})${tag}\n`);
        return inst;
    }

    console.log("Found Discord installations:\n");
    installations.forEach((inst, i) => {
        const tag = inst.injected ? "injected     " : "NOT INJECTED ";
        console.log(`  [${i + 1}] ${tag}  ${inst.variant.padEnd(22)} ${inst.appDir}  (${inst.winUser})`);
    });
    console.log();

    while (true) {
        const answer = await prompt(`Select [1-${installations.length}]: `);
        const n = parseInt(answer, 10);
        if (n >= 1 && n <= installations.length) return installations[n - 1];
        console.log("Invalid choice, try again.");
    }
}

// ── First-time injection ──────────────────────────────────────────────────────

function resolveWinDistPath(target, allInstalls) {
    // Prefer dist path from another already-injected install
    const other = allInstalls.find(i => i.injected && i.winDistPath);
    if (other) return other.winDistPath;

    // Fallback: C:\Users\<winUser>\Vencord\dist
    return `C:\\Users\\${target.winUser}\\Vencord\\dist`;
}

function inject(target, winDistPath) {
    const { appAsarPath, resourcesDir } = target;
    const backupPath = join(resourcesDir, "_app.asar");

    // Backup the original asar (whether file or directory)
    if (!existsSync(backupPath)) {
        console.log("  Backing up original app.asar → _app.asar");
        renameSync(appAsarPath, backupPath);
    } else {
        // Already has a backup — just remove the current (failed?) injection
        console.log("  _app.asar backup already exists, replacing current injection");
        const st = statSync(appAsarPath);
        if (st.isDirectory()) {
            // Remove directory recursively via shell
            spawnSync("rm", ["-rf", appAsarPath]);
        } else {
            // It's a file, just overwrite below
        }
    }

    const requireLine = `require("${winDistPath}\\\\patcher.js");`;
    const packageJson = `{\n\t"name": "discord",\n\t"main": "index.js"\n}`;

    // Write a minimal ASAR file (works across all Electron versions)
    const asar = buildAsar({ "index.js": requireLine, "package.json": packageJson });
    writeFileSync(appAsarPath, asar);
    console.log(`  Injected → ${winDistPath}`);
}

// ── Kill & relaunch ───────────────────────────────────────────────────────────

function killDiscord(exeName) {
    process.stdout.write(`Killing ${exeName}... `);
    spawnSync("taskkill.exe", ["/IM", exeName, "/F"], { stdio: "pipe" });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 800);
    console.log("done");
}

function launchDiscord(exeWin) {
    console.log(`Launching ${exeWin}`);
    const child = spawn("cmd.exe", ["/c", "start", "", exeWin], {
        stdio: "ignore",
        detached: true,
    });
    child.unref();
}

// ── Main ──────────────────────────────────────────────────────────────────────

const skipBuild = process.argv.includes("--no-build");

if (skipBuild) {
    console.log("Skipping build (--no-build).\n");
} else {
    console.log("Building Vencord...\n");
    execSync("pnpm build", { cwd: BASE_DIR, stdio: "inherit" });
    console.log();
}

const users = findWindowsUsers();
const allInstalls = users.flatMap(scanInstalls);

if (allInstalls.length === 0) {
    console.error("No Discord installations found on Windows.");
    process.exit(1);
}

const target = await selectInstallation(allInstalls);

// First-time injection if needed
if (!target.injected) {
    const winDistPath = resolveWinDistPath(target, allInstalls);
    console.log(`\nInjecting Vencord into ${target.variant}...`);
    inject(target, winDistPath);
    target.wslDistPath = winPathToWsl(winDistPath);
}

if (!existsSync(target.wslDistPath)) {
    console.error(`\nDist path not found: ${target.wslDistPath}`);
    console.error("Make sure Vencord is installed on Windows at that path.");
    process.exit(1);
}

killDiscord(target.exeName);

const distFiles = readdirSync(DIST_DIR).filter(f => statSync(join(DIST_DIR, f)).isFile());
for (const file of distFiles) {
    copyFileSync(join(DIST_DIR, file), join(target.wslDistPath, file));
}
console.log(`Copied ${distFiles.length} files to ${target.winDistPath ?? target.wslDistPath}`);

launchDiscord(target.exeWin);
console.log("\nDone!");
process.exit(0);
