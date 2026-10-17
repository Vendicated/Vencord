/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { SettingsRouter, showToast } from "@webpack/common";

export interface SettingsRoute {
    route: string;
    label: string;
    keywords?: string[];
}

export const DISCORD_SETTINGS_ROUTES: SettingsRoute[] = [
    { route: "my_account", label: "My Account", keywords: ["account", "profile"] },
    { route: "profiles", label: "Profiles", keywords: ["profile", "avatar", "bio"] },
    { route: "data_and_privacy", label: "Data & Privacy", keywords: ["privacy", "safety"] },
    { route: "devices", label: "Devices", keywords: ["sessions"] },
    { route: "connections", label: "Connections", keywords: ["integrations"] },
    { route: "appearance", label: "Appearance", keywords: ["theme", "dark", "light"] },
    { route: "accessibility", label: "Accessibility", keywords: [] },
    { route: "voice_and_video", label: "Voice & Video", keywords: ["audio", "mic", "camera"] },
    { route: "chat", label: "Chat", keywords: ["messages"] },
    { route: "text_and_images", label: "Text & Images", keywords: ["text", "images"] },
    { route: "notifications", label: "Notifications", keywords: [] },
    { route: "keybinds", label: "Keybinds", keywords: ["shortcuts"] },
    { route: "authorized_apps", label: "Authorized Apps", keywords: ["oauth", "apps"] },
    { route: "family_center", label: "Family Center", keywords: ["family", "safety"] },
    { route: "advanced", label: "Advanced", keywords: ["developer"] },
    { route: "equicord_main", label: "Equicord", keywords: ["vencord"] },
    { route: "equicord_plugins", label: "Equicord Plugins", keywords: ["plugins"] },
    { route: "equicord_themes", label: "Equicord Themes", keywords: ["themes", "css"] },
    { route: "equicord_updater", label: "Equicord Updater", keywords: ["update"] },
    { route: "equicord_changelog", label: "Equicord Changelog", keywords: ["changelog", "news"] }
];

const ROUTE_ALIASES = new Map<string, string[]>([
    ["my_account", ["my_account_panel", "account"]],
    ["data_and_privacy", ["privacy_and_safety", "privacy_&_safety", "data_and_privacy_panel"]],
    ["notifications", ["legacy_notifications_settings", "notifications_panel"]],
    ["voice_and_video", ["voice_video", "voice_and_video_panel"]],
    ["text_and_images", ["text_images", "text_and_images_panel"]],
    ["appearance", ["appearance_panel"]],
    ["accessibility", ["accessibility_panel"]],
    ["keybinds", ["keybinds_panel"]],
    ["advanced", ["advanced_panel"]],
    ["profiles", ["profiles_panel"]],
    ["devices", ["devices_panel", "sessions_panel"]],
    ["connections", ["connections_panel"]],
    ["chat", ["chat_panel"]],
    ["authorized_apps", ["authorized_apps_panel"]],
    ["family_center", ["family_center_panel"]],
    ["equicord_main", ["equicord_main_panel"]],
    ["equicord_plugins", ["equicord_plugins_panel"]],
    ["equicord_themes", ["equicord_themes_panel"]],
    ["equicord_updater", ["equicord_updater_panel"]],
    ["equicord_changelog", ["equicord_changelog_panel"]]
]);

const ROUTE_LOOKUP = (() => {
    const lookup = new Map<string, string>();
    for (const [canonical, aliases] of ROUTE_ALIASES) {
        lookup.set(canonical, canonical);
        for (const alias of aliases) lookup.set(alias, canonical);
    }
    return lookup;
})();

function normalizeRoute(route: string): string {
    return route
        .trim()
        .toLowerCase()
        .replace(/^\/+/, "")
        .replace(/\s+/g, "_")
        .replace(/&/g, "and");
}

function resolveRouteCandidates(route: string): string[] {
    const normalized = normalizeRoute(route);
    if (!normalized) return [];

    const canonical = ROUTE_LOOKUP.get(normalized) ?? normalized;
    const aliases = ROUTE_ALIASES.get(canonical) ?? [];
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const candidate of [canonical, ...aliases, normalized]) {
        const base = normalizeRoute(candidate);
        if (!base) continue;

        const expanded = base.endsWith("_panel")
            ? [base, base.slice(0, -"_panel".length)]
            : [`${base}_panel`, base];

        for (const item of expanded) {
            const key = normalizeRoute(item);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            unique.push(key);
        }
    }

    return unique;
}

const logger = new Logger("CommandPalette");

export async function openSettingsPage(route: string, label?: string) {
    const candidates = resolveRouteCandidates(route);
    if (candidates.length === 0) {
        showToast({ text: "No settings page was provided.", variant: "critical" });
        return false;
    }

    for (const candidate of candidates) {
        try {
            await Promise.resolve(SettingsRouter.openUserSettings(candidate));
            return true;
        } catch (e) {
            logger.debug(`Settings route failed: ${candidate}`, e);
            continue;
        }
    }

    showToast({ text: `Unable to open ${label ?? "that settings page"}.`, variant: "critical" });
    return false;
}
