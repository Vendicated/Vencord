/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";
import SettingsPlugin from "plugins/_core/settings";
import { JSX } from "react";

import gitHash from "~git-hash";

import { ChromeIcon, DevBannerIcon, DiscordIcon, ElectronIcon, EquicordIcon } from "./components";
import { settings } from "./settings";

function getVersion(): string {
    if (IS_DEV) return "Dev";
    if (IS_WEB) return "Web";
    if (IS_VESKTOP) return `Vesktop v${VesktopNative.app.getVersion()}`;
    if (IS_EQUIBOP) return `Equibop v${VesktopNative.app.getVersion()}`;
    if (IS_STANDALONE) return "Standalone";
    return "";
}

export function transform(state?: string): string | JSX.Element {
    const { RELEASE_CHANNEL, BUILD_NUMBER, VERSION_HASH } = window.GLOBAL_ENV;
    const buildChannel = names[RELEASE_CHANNEL] || RELEASE_CHANNEL.charAt(0).toUpperCase() + RELEASE_CHANNEL.slice(1);
    const { chromiumVersion, electronVersion } = SettingsPlugin;
    const format = settings.store.format ?? "{devBannerIcon} {buildChannel} {buildNumber} ({buildHash}) | {equicordIcon} {equicordName} {equicordVersion} ({equicordHash})";
    const baseFormat = state ?? format;

    const replaced = baseFormat
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
        .replace(/{chromiumVersion}/g, chromiumVersion)
        .replace(/\\n|{newline}/g, "__NEWLINE__");

    if (!replaced.includes("__NEWLINE__") && !/{.*Icon}/.test(baseFormat)) {
        return replaced;
    }

    const parts = replaced.split(/({.*?}|__NEWLINE__)/).filter(Boolean).map((part, i) => {
        switch (part) {
            case "{discordIcon}":
                return <span key={`icon-discord-${i}`} className="vc-discord-dev-banner-icons"><DiscordIcon /></span>;
            case "{equicordIcon}":
                return <span key={`icon-equicord-${i}`} className="vc-discord-dev-banner-icons"><EquicordIcon /></span>;
            case "{electronIcon}":
                return <span key={`icon-electron-${i}`} className="vc-discord-dev-banner-icons"><ElectronIcon /></span>;
            case "{chromiumIcon}":
                return <span key={`icon-chromium-${i}`} className="vc-discord-dev-banner-icons"><ChromeIcon /></span>;
            case "{devBannerIcon}":
                return <span key={`icon-dev-${i}`} className="vc-discord-dev-banner-icons"><DevBannerIcon /></span>;
            case "__NEWLINE__":
                return <br key={`br-${i}`} />;
            default:
                return <React.Fragment key={`text-${i}`}>{part}</React.Fragment>;
        }
    });

    return <div style={{ display: "inline" }}>{parts}</div>;
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
                    match: /children:\[.*?\{\}\)\]/g,
                    replace: "children:$self.transform()"
                },
            ]
        }
    ],
    transform,
});
