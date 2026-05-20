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

import { PluginNative } from "@utils/types";

const NATIVE_HELPER_KEYS = ["OnlineThemeInstaller", "BDThemeSelector", "BdThemeSelector"] as const;

type NativeExports = typeof import("./native");

function getNativeFetchText(): ((url: string) => Promise<string>) | null {
    for (const key of NATIVE_HELPER_KEYS) {
        const helper = VencordNative.pluginHelpers[key] as PluginNative<NativeExports> | undefined;
        const fetchText = helper?.fetchText;
        if (fetchText) {
            return (url: string) => fetchText(url);
        }
    }
    return null;
}

async function ensureConnectCsp(): Promise<void> {
    if (IS_WEB) return;

    try {
        await VencordNative.csp.requestAddOverride(
            "https://betterdiscord.app",
            ["connect-src"],
            "OnlineThemeInstaller"
        );
    } catch { }
}

async function fetchHtmlInRenderer(url: string): Promise<string> {
    await ensureConnectCsp();

    const res = await fetch(url, {
        headers: { Accept: "text/html,application/xhtml+xml" },
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    return res.text();
}

function buildLoadError(browserError: unknown): Error {
    const browserMsg = browserError instanceof Error ? browserError.message : String(browserError);
    const helpers = Object.keys(VencordNative.pluginHelpers ?? {}).sort().join(", ") || "(none)";

    if (IS_DISCORD_DESKTOP || IS_VESKTOP) {
        return new Error(
            "Could not load themes from betterdiscord.app. " +
            "Run setup.ps1 (or pnpm build && pnpm inject in your Vencord folder), then fully quit and restart Discord. " +
            `Browser fetch: ${browserMsg}. Loaded native helpers: ${helpers}.`
        );
    }

    return new Error(`Could not load themes from betterdiscord.app (${browserMsg}).`);
}

export async function fetchHtml(url: string): Promise<string> {
    const nativeFetch = getNativeFetchText();

    if ((IS_DISCORD_DESKTOP || IS_VESKTOP) && nativeFetch) {
        try {
            return await nativeFetch(url);
        } catch (e) {
            console.warn("[OnlineThemeInstaller] native fetch failed, trying renderer fetch", e);
        }
    }

    try {
        return await fetchHtmlInRenderer(url);
    } catch (browserError) {
        if (nativeFetch) {
            return nativeFetch(url);
        }
        throw buildLoadError(browserError);
    }
}
