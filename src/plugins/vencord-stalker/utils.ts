/* eslint-disable simple-header/header */
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

import { Logger } from "@utils/Logger";

import { isDebugEnabled, settings } from "./settings";

const _logger = new Logger("Stalker", "#a7d46d");

export const logger = {
    log: (...args: any[]) => {
        if (isDebugEnabled()) _logger.log(...args);
    },
    info: (...args: any[]) => {
        if (isDebugEnabled()) _logger.info(...args);
    },
    warn: (...args: any[]) => {
        if (isDebugEnabled()) _logger.warn(...args);
    },
    error: (...args: any[]) => {
        _logger.error(...args);
    },
    debug: (...args: any[]) => {
        if (isDebugEnabled()) {
            if (typeof (_logger as any).debug === "function") {
                (_logger as any).debug(...args);
            } else {
                _logger.log("[DEBUG]", ...args);
            }
        }
    }
};

export function addToWhitelist(id: string) {
    const items = settings.store.whitelistedIds ? settings.store.whitelistedIds.split(",").map(s => s.trim()).filter(Boolean) : [];
    if (!items.includes(id)) items.push(id);
    settings.store.whitelistedIds = items.join(",");
}

export function removeFromWhitelist(id: string) {
    const items = settings.store.whitelistedIds ? settings.store.whitelistedIds.split(",").map(s => s.trim()).filter(Boolean) : [];
    const index = items.indexOf(id);
    if (index !== -1) items.splice(index, 1);
    settings.store.whitelistedIds = items.join(",");
}

export function isInWhitelist(id: string) {
    const items = settings.store.whitelistedIds ? settings.store.whitelistedIds.split(",").map(s => s.trim()).filter(Boolean) : [];
    return items.includes(id);
}


// build CDN URL for avatar decoration
export function getAvatarDecorationUrl(decorationData: { asset: string; skuId: string; } | null): string | null {
    if (!decorationData?.asset) return null;

    const { asset } = decorationData;
    const cleanAsset = asset.startsWith("a_") ? asset.substring(2) : asset;
    return `https://cdn.discordapp.com/avatar-decoration-presets/${cleanAsset}.png?size=160`;
}

export function formatTimestamp(ts: number) {
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return String(ts);
    }
}

export function getDurationLabel(durationMs?: number) {
    if (!durationMs || durationMs <= 0) return null;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export function getStatusLabel(status?: string | null) {
    if (!status) return "unknown";
    return status;
}

export function getStatusClass(status?: string | null) {
    const normalized = status?.toLowerCase() ?? "unknown";
    return `stalker-status-badge stalker-status-badge--${normalized}`;
}


export function formatActivitySummary(activities: any[]) {
    if (!activities || activities.length === 0) return undefined;

    const gameActivities = activities.filter(a => a.type !== 4);
    if (gameActivities.length === 0) return undefined;

    return gameActivities.map(activity => {
        const parts = [activity.name || "Unknown"];

        if (activity.details) parts.push(activity.details);
        if (activity.state) parts.push(activity.state);

        if (activity.type === 2 && activity.assets) {
            if (activity.assets.large_text) parts.push(activity.assets.large_text);
        }


        return parts.join(" - ");
    }).join(", ");
}

export function getActivitySnapshots(activities: any[]) {
    if (!activities) return [] as any[];
    return activities
        .filter(a => a && a.type !== 4)
        .map(a => ({
            name: a.name,
            type: a.type,
            details: a.details,
            state: a.state,
            assets: a.assets,
            application_id: (a as any).application_id ?? (a as any).applicationId
        }));
}

export function summarizeClientStatus(statusMap?: Record<string, string>) {
    if (!statusMap) return undefined;
    const entries = Object.entries(statusMap).filter(([, status]) => status && status !== "offline");
    if (!entries.length) return undefined;
    return entries.map(([device, status]) => `${device}:${status}`).join(", ");
}

