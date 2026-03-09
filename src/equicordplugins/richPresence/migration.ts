/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { migratePluginSettings, Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";

import { settings, SettingsStore } from "./settings";

type SettingsKey = keyof SettingsStore;

const logger = new Logger("RichPresence:Migration");

interface MigrationMapping {
    oldPlugin: string;
    enableKey: SettingsKey;
    keys: Record<string, SettingsKey>;
}

const migrations: MigrationMapping[] = [
    {
        oldPlugin: "AudioBookShelfRichPresence",
        enableKey: "abs_enabled",
        keys: {
            serverUrl: "abs_serverUrl",
            username: "abs_username",
            password: "abs_password",
        },
    },
    {
        oldPlugin: "StatsfmPresence",
        enableKey: "sfm_enabled",
        keys: {
            username: "sfm_username",
            shareUsername: "sfm_shareUsername",
            shareSong: "sfm_shareSong",
            hideWithSpotify: "sfm_hideWithSpotify",
            hideWithExternalRPC: "sfm_hideWithExternalRPC",
            statusName: "sfm_statusName",
            nameFormat: "sfm_nameFormat",
            useListeningStatus: "sfm_useListeningStatus",
            missingArt: "sfm_missingArt",
            showStatsFmLogo: "sfm_showLogo",
            alwaysHideArt: "sfm_alwaysHideArt",
        },
    },
    {
        oldPlugin: "JellyfinRichPresence",
        enableKey: "jf_enabled",
        keys: {
            serverUrl: "jf_serverUrl",
            apiKey: "jf_apiKey",
            userId: "jf_userId",
            nameDisplay: "jf_nameDisplay",
            customName: "jf_customName",
            coverType: "jf_coverType",
            episodeFormat: "jf_episodeFormat",
            showEpisodeName: "jf_showEpisodeName",
            overrideRichPresenceType: "jf_overrideType",
            showPausedState: "jf_showPausedState",
            privacyMode: "jf_privacyMode",
        },
    },
    {
        oldPlugin: "ListenBrainzRPC",
        enableKey: "lb_enabled",
        keys: {
            username: "lb_username",
            mbContact: "lb_mbContact",
            shareUsername: "lb_shareUsername",
            shareSong: "lb_shareSong",
            hideWithSpotify: "lb_hideWithSpotify",
            hideWithActivity: "lb_hideWithActivity",
            useTimeBar: "lb_useTimeBar",
            statusName: "lb_statusName",
            nameFormat: "lb_nameFormat",
            useListeningStatus: "lb_useListeningStatus",
            missingArt: "lb_missingArt",
            useLogo: "lb_useLogo",
        },
    },
    {
        oldPlugin: "GensokyoRadioRPC",
        enableKey: "gr_enabled",
        keys: {
            refreshInterval: "gr_refreshInterval",
        },
    },
];

function setStoreValue(key: SettingsKey, value: boolean | string | number) {
    (settings.store[key] as boolean | string | number) = value;
}

export function migrateOldSettings() {
    if (Settings.plugins.RichPresence._migrated) return;

    migratePluginSettings("RichPresence", "AudioBookShelfRichPresence", "GensokyoRadioRPC", "JellyfinRichPresence", "ListenBrainzRPC", "StatsfmPresence", "TosuRPC");

    for (const migration of migrations) {
        const oldSettings = Settings.plugins[migration.oldPlugin];
        if (!oldSettings) continue;

        if (oldSettings.enabled) {
            setStoreValue(migration.enableKey, true);
        }

        for (const [oldKey, newKey] of Object.entries(migration.keys)) {
            if (oldSettings[oldKey] != null) {
                setStoreValue(newKey, oldSettings[oldKey]);
            }
        }

        logger.info(`Migrated settings from ${migration.oldPlugin}`);
    }

    const tosuSettings = Settings.plugins.TosuRPC;
    if (tosuSettings?.enabled) {
        setStoreValue("tosu_enabled", true);
    }

    Settings.plugins.RichPresence._migrated = true;
}
