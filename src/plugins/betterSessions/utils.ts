/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { UserStore } from "@webpack/common";

import { ChromeIcon, DiscordIcon, EdgeIcon, FirefoxIcon, IEIcon, MobileIcon, OperaIcon, SafariIcon, UnknownIcon } from "./components/icons";
import { SessionInfo } from "./types";

const getDataKey = () => `BetterSessions_savedSessions_${UserStore.getCurrentUser().id}`;

export const savedSessionsCache: Map<string, { name: string, isNew: boolean; }> = new Map();

export function getDefaultName(clientInfo: SessionInfo["session"]["client_info"]) {
    return `${clientInfo.os} · ${clientInfo.platform}`;
}

export function saveSessionsToDataStore() {
    return DataStore.set(getDataKey(), savedSessionsCache);
}

export async function fetchNamesFromDataStore() {
    const savedSessions = await DataStore.get<Map<string, { name: string, isNew: boolean; }>>(getDataKey()) || new Map();
    savedSessions.forEach((data, idHash) => {
        savedSessionsCache.set(idHash, data);
    });
}

export function GetOsColor(os: string) {
    switch (os) {
        case "Windows Mobile":
        case "Windows":
            return "#55a6ef"; // Light blue
        case "Linux":
            return "#cdcd31"; // Yellow
        case "Android":
            return "#7bc958"; // Green
        case "Mac OS X":
        case "iOS":
            return ""; // Default to white/black (theme-dependent)
        default:
            return "#f3799a"; // Pink
    }
}

export function GetPlatformIcon(platform: string) {
    switch (platform) {
        case "Discord Android":
        case "Discord iOS":
        case "Discord Client":
            return DiscordIcon;
        case "Android Chrome":
        case "Chrome iOS":
        case "Chrome":
            return ChromeIcon;
        case "Edge":
            return EdgeIcon;
        case "Firefox":
            return FirefoxIcon;
        case "Internet Explorer":
            return IEIcon;
        case "Opera Mini":
        case "Opera":
            return OperaIcon;
        case "Mobile Safari":
        case "Safari":
            return SafariIcon;
        case "BlackBerry":
        case "Facebook Mobile":
        case "Android Mobile":
            return MobileIcon;
        default:
            return UnknownIcon;
    }
}
