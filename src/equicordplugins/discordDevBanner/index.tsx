/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import SettingsPlugin from "plugins/_core/settings";

import gitHash from "~git-hash";

import { settings } from "./settings";

function getVersion(): string {
    if (IS_DEV) return "Dev";
    if (IS_WEB) return "Web";
    if (IS_VESKTOP) return `Vesktop v${VesktopNative.app.getVersion()}`;
    if (IS_EQUIBOP) return `Equibop v${VesktopNative.app.getVersion()}`;
    if (IS_STANDALONE) return "Standalone";
    return "";
}

export function transform(state?: string): string {
    const { RELEASE_CHANNEL, BUILD_NUMBER, VERSION_HASH } = window.GLOBAL_ENV;
    const buildChannel: string = names[RELEASE_CHANNEL] || RELEASE_CHANNEL.charAt(0).toUpperCase() + RELEASE_CHANNEL.slice(1);
    const { chromiumVersion, electronVersion, } = SettingsPlugin;
    const format = settings.store.format ?? "{buildChannel} {buildNumber} ({buildHash}) | {equicordName} {equicordVersion} ({equicordHash})";
    const baseFormat = state ?? format;

    const formatted = baseFormat
        .replace(/{discordName}/g, "Discord")
        .replace(/{buildChannel}/g, buildChannel)
        .replace(/{buildNumber}/g, BUILD_NUMBER)
        .replace(/{buildHash}/g, VERSION_HASH.slice(0, 9))
        .replace(/{equicordName}/g, "Equicord")
        .replace(/{equicordVersion}/g, VERSION)
        .replace(/{equicordHash}/g, gitHash)
        .replace(/{equicordPlatform}/g, getVersion())
        .replace(/{electronName}/g, "Electron")
        .replace(/{electronVersion}/g, electronVersion)
        .replace(/{chromiumName}/g, "Chromium")
        .replace(/{chromiumVersion}/g, chromiumVersion);

    return formatted;
}

const names: Record<string, string> = {
    stable: "Stable",
    ptb: "PTB",
    canary: "Canary",
    staging: "Staging"
};

export default definePlugin({
    name: "DiscordDevBanner",
    description: "Enables the Discord developer banner, in which displays the build-ID",
    authors: [EquicordDevs.KrystalSkull, EquicordDevs.thororen],
    settings,
    patches: [
        {
            find: ".devBanner,",
            replacement: [
                {
                    match: '"staging"===window.GLOBAL_ENV.RELEASE_CHANNEL',
                    replace: "true"
                },
                {
                    match: /(\i=\(\)=>)\(.*?\}\);/,
                    replace: "$1null;"
                },
                {
                    match: /\i\.\i\.format\(.{0,40}\)/,
                    replace: "$self.transform()"
                },
            ]
        }
    ],
    transform,
});
