/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { detectClient } from "@plugins/_core/supportHelper";
import { gitHashShort } from "@shared/vencordUserAgent";
import { React } from "@webpack/common";
import SettingsPlugin from "plugins/_core/settings";
import { JSX } from "react";

import { ChromiumIcon, ClientIcon, DevBannerIcon, DiscordIcon, ElectronIcon, EquicordIcon, names, settings } from ".";

export function makeDevBanner(state?: string): string | JSX.Element {
    const { RELEASE_CHANNEL, BUILD_NUMBER, VERSION_HASH } = window.GLOBAL_ENV;
    const buildChannel = names[RELEASE_CHANNEL] || RELEASE_CHANNEL.charAt(0).toUpperCase() + RELEASE_CHANNEL.slice(1);
    const { chromiumVersion, electronVersion, getVersionInfo } = SettingsPlugin;
    const format = settings.store.format ?? "{devbannerIcon} {buildChannel} {buildNumber} ({buildHash}) | {equicordIcon} {equicordName} {equicordVersion} ({equicordHash})";
    const baseFormat = state ?? format;

    const clientInfo = detectClient();

    const replaced = baseFormat
        .replace(/{buildChannel}/g, buildChannel)
        .replace(/{buildNumber}/g, BUILD_NUMBER)
        .replace(/{buildHash}/g, VERSION_HASH.slice(0, 9))
        .replace(/{equicordVersion}/g, VERSION)
        .replace(/{equicordHash}/g, gitHashShort)
        .replace(/{equicordPlatform}/g, getVersionInfo(false))
        .replace(/{electronVersion}/g, electronVersion)
        .replace(/{chromiumVersion}/g, chromiumVersion)
        .replace(/{clientName}/g, clientInfo.name)
        .replace(/{clientVersion}/g, `v${clientInfo?.version ?? "0.0.0"}`)
        .replace(/{equibopHash}/g, clientInfo.shortHash ?? "Not Supported")
        .replace(/{equibopPlatform}/g, `v${clientInfo?.dev ? "Dev Build" : "Standalone"}`)
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
                return <span key={`icon-chromium-${i}`} className="vc-discord-dev-banner-icons"><ChromiumIcon /></span>;
            case "{devbannerIcon}":
                return <span key={`icon-dev-${i}`} className="vc-discord-dev-banner-icons"><DevBannerIcon /></span>;
            case "{clientIcon}":
                return <span key={`icon-dev-${i}`} className="vc-discord-dev-banner-icons"><ClientIcon /></span>;
            case "__NEWLINE__":
                return <br key={`br-${i}`} />;
            default:
                return <React.Fragment key={`text-${i}`}>{part}</React.Fragment>;
        }
    });

    return <div style={{ display: "inline" }}>{parts}</div>;
}
