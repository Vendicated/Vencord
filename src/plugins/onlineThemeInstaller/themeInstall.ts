/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import { Settings } from "@api/Settings";
import { PluginNative } from "@utils/types";

import { parseThemePageSource } from "./api";
import { resolveThemeStylesheetUrls } from "./resolveThemeCss";
import type { BDTheme } from "./types";

const PLUGIN = "OnlineThemeInstaller";
const LEGACY_PLUGIN = "BDThemeSelector";
const NATIVE_KEYS = ["OnlineThemeInstaller", "BDThemeSelector", "BdThemeSelector"] as const;

export interface ThemeInstallRecord {
    urls: string[];
    localFile?: string;
}

type InstallMap = Record<string, ThemeInstallRecord>;

function getNative(): PluginNative<typeof import("./native")> | null {
    for (const key of NATIVE_KEYS) {
        const helper = VencordNative.pluginHelpers[key] as PluginNative<typeof import("./native")> | undefined;
        if (helper?.fetchText && helper?.saveThemeFile) return helper;
        if (helper?.fetchText) return helper;
    }
    return null;
}

type PluginSettings = { installMap?: string; };

function getInstallMap(): InstallMap {
    const plugins = Settings.plugins as Record<string, PluginSettings | undefined>;
    const raw = plugins?.[PLUGIN]?.installMap ?? plugins?.[LEGACY_PLUGIN]?.installMap;
    if (!raw) return {};
    try {
        return JSON.parse(raw) as InstallMap;
    } catch {
        return {};
    }
}

function setInstallMap(map: InstallMap): void {
    const plugins = Settings.plugins as Record<string, PluginSettings>;
    plugins[PLUGIN] = {
        ...plugins[PLUGIN],
        installMap: JSON.stringify(map),
    };
}

function sanitizeFileName(name: string, id: number): string {
    const base = name.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").slice(0, 72);
    return `oti-${id}-${base || "theme"}.css`;
}

export function getInstalledThemeUrls(): string[] {
    return Settings.themeLinks ?? [];
}

export function getInstallRecord(theme: BDTheme): ThemeInstallRecord | undefined {
    return getInstallMap()[String(theme.id)];
}

export function isThemeInstalled(theme: BDTheme): boolean {
    const record = getInstallRecord(theme);
    if (record) {
        if (record.localFile && Settings.enabledThemes?.includes(record.localFile)) return true;
        if (record.urls.some(url => getInstalledThemeUrls().includes(url))) return true;
    }
    return getInstalledThemeUrls().includes(theme.downloadUrl);
}

export async function installTheme(
    theme: BDTheme,
    fetchText: (url: string) => Promise<string>
): Promise<{ urls: string[]; localFile?: string; }> {
    let pageSource: string | null = null;
    const pageUrls = [
        theme.pageUrl,
        theme.pageUrl.replace("/themes/", "/theme/"),
    ];
    for (const pageUrl of [...new Set(pageUrls)]) {
        try {
            const pageHtml = await fetchText(pageUrl);
            pageSource = parseThemePageSource(pageHtml);
            if (pageSource) break;
        } catch (e) {
            console.warn("[OnlineThemeInstaller] theme page fetch failed:", pageUrl, e);
        }
    }

    const css = await fetchText(theme.downloadUrl);
    const resolved = resolveThemeStylesheetUrls(css, pageSource);
    const map = getInstallMap();
    const key = String(theme.id);

    if (resolved.urls.length) {
        const links = getInstalledThemeUrls().filter(link => link !== theme.downloadUrl);
        const merged = [...new Set([...links, ...resolved.urls])];
        Settings.themeLinks = merged;

        map[key] = { urls: resolved.urls };
        setInstallMap(map);

        return { urls: resolved.urls };
    }

    if (!resolved.saveLocal) {
        throw new Error("Could not find a stylesheet URL in this theme. Open its store page and add the CSS link manually.");
    }

    const native = getNative();
    if (!native?.saveThemeFile) {
        throw new Error("Could not save theme locally. Rebuild Vencord and run pnpm inject, then restart Discord.");
    }

    const fileName = sanitizeFileName(theme.name, theme.id);
    await native.saveThemeFile(fileName, css);

    const enabled = Settings.enabledThemes ?? [];
    if (!enabled.includes(fileName)) {
        Settings.enabledThemes = [...enabled, fileName];
    }

    map[key] = { urls: [], localFile: fileName };
    setInstallMap(map);

    return { urls: [], localFile: fileName };
}

export function uninstallTheme(theme: BDTheme): void {
    const map = getInstallMap();
    const key = String(theme.id);
    const record = map[key];

    let links = getInstalledThemeUrls();

    if (record) {
        if (record.urls.length) {
            links = links.filter(link => !record.urls.includes(link));
        }
        if (record.localFile) {
            Settings.enabledThemes = (Settings.enabledThemes ?? []).filter(f => f !== record.localFile);
            const native = getNative();
            void native?.deleteThemeFile?.(record.localFile);
        }
        delete map[key];
        setInstallMap(map);
    } else {
        links = links.filter(link => link !== theme.downloadUrl);
    }

    Settings.themeLinks = links;
}
