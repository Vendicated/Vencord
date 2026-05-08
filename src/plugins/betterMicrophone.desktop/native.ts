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

import { DATA_DIR } from "@main/utils/constants";
import { downloadToFile, fetchJson } from "@main/utils/http";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { IpcMainInvokeEvent } from "electron";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

const PRELOAD_WORLD_ID = 999;
const PATCHER_RELEASE_API = "https://api.github.com/repos/sultriness/DiscordVoicePatcher/releases/latest";
const PATCHER_CACHE_DIR = join(DATA_DIR, "plugins", "BetterMicrophone");
const PATCHER_CACHE_NODE_PATH = join(PATCHER_CACHE_DIR, "patcher.node");
const PATCHER_CACHE_INI_PATH = join(PATCHER_CACHE_DIR, "patcher.ini");
const PATCHER_CACHE_META_PATH = join(PATCHER_CACHE_DIR, "release.json");

type ResolvedAssets = { patcherPath: string; iniPath: string; source: string; };
type GitHubReleaseAsset = { id: number; name: string; browser_download_url: string; };
type GitHubRelease = { tag_name: string; assets: GitHubReleaseAsset[]; };
type CachedReleaseMeta = { tagName: string; patcherAssetId: number; iniAssetId: number; };

let downloadedAssetsPromise: Promise<ResolvedAssets | null> | null = null;

function getHeaders() {
    return { Accept: "application/vnd.github+json", "User-Agent": VENCORD_USER_AGENT };
}

function loadCachedMeta(): CachedReleaseMeta | null {
    if (!existsSync(PATCHER_CACHE_META_PATH)) return null;
    try { return JSON.parse(readFileSync(PATCHER_CACHE_META_PATH, "utf8")); } catch { return null; }
}

async function downloadAsset(url: string, targetPath: string) {
    const tmp = `${targetPath}.download`;
    try {
        await downloadToFile(url, tmp, { headers: getHeaders() });
        if (existsSync(targetPath)) unlinkSync(targetPath);
        renameSync(tmp, targetPath);
    } finally {
        if (existsSync(tmp)) unlinkSync(tmp);
    }
}

async function resolveAssets(): Promise<ResolvedAssets | null> {
    downloadedAssetsPromise ??= (async () => {
        mkdirSync(PATCHER_CACHE_DIR, { recursive: true });
        const cached = existsSync(PATCHER_CACHE_NODE_PATH) && existsSync(PATCHER_CACHE_INI_PATH);
        try {
            const release = await fetchJson<GitHubRelease>(PATCHER_RELEASE_API, { headers: getHeaders() });
            const patcherAsset = release.assets?.find(a => a.name.toLowerCase() === "patcher.node") ?? null;
            const iniAsset = release.assets?.find(a => a.name.toLowerCase() === "patcher.ini") ?? null;
            if (!patcherAsset || !iniAsset) throw new Error("Release missing patcher.node or patcher.ini");
            const meta = loadCachedMeta();
            if (!cached || meta?.tagName !== release.tag_name || meta?.patcherAssetId !== patcherAsset.id || meta?.iniAssetId !== iniAsset.id) {
                await downloadAsset(patcherAsset.browser_download_url, PATCHER_CACHE_NODE_PATH);
                await downloadAsset(iniAsset.browser_download_url, PATCHER_CACHE_INI_PATH);
                writeFileSync(PATCHER_CACHE_META_PATH, JSON.stringify({ tagName: release.tag_name, patcherAssetId: patcherAsset.id, iniAssetId: iniAsset.id }, null, 2));
            }
            return { patcherPath: PATCHER_CACHE_NODE_PATH, iniPath: PATCHER_CACHE_INI_PATH, source: `release ${release.tag_name}` };
        } catch {
            if (!cached) return null;
            const meta = loadCachedMeta();
            return { patcherPath: PATCHER_CACHE_NODE_PATH, iniPath: PATCHER_CACHE_INI_PATH, source: meta?.tagName ? `cached ${meta.tagName}` : "cached" };
        }
    })();
    const result = await downloadedAssetsPromise;
    if (!result) downloadedAssetsPromise = null;
    return result;
}

export async function applyPatches(event: IpcMainInvokeEvent) {
    const assets = await resolveAssets();
    if (!assets) throw new Error("Could not locate BetterMicrophone voice assets");
    const { patcherPath, iniPath, source } = assets;
    const result = await event.sender.executeJavaScriptInIsolatedWorld(PRELOAD_WORLD_ID, [{
        code: `(() => {
            try {
                const requireFn = typeof globalThis.require === "function"
                    ? globalThis.require
                    : (() => {
                        const m = globalThis.process?.getBuiltinModule?.("module") ?? globalThis.process?.getBuiltinModule?.("node:module");
                        if (!m?.createRequire) throw new Error("No require available");
                        return m.createRequire(${JSON.stringify(patcherPath)});
                    })();
                return requireFn(${JSON.stringify(patcherPath)}).applyPatches(${JSON.stringify(iniPath)});
            } catch (e) {
                return { error: e instanceof Error ? e.name + ": " + e.message : String(e) };
            }
        })();`
    }]);
    if (result == null) throw new Error("Isolated-world execution returned no result");
    return { assetSource: source, ...result };
}
