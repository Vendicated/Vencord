/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import gitHash from "~git-hash";

const PLUGIN_NAME = "ShowDevBanner";
const LEGACY_SETTINGS_ID = "devBanner";

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "Controls what is shown in the developer banner",
        options: [
            {
                label: "Minimal",
                value: "minimal",
                default: false,
            },
            {
                label: "Default",
                value: "default",
                default: true,
            },
            {
                label: "Full",
                value: "full",
                default: false,
            },
            {
                label: "Custom",
                value: "custom",
                default: false,
            },
        ],
    },

    // Only used when mode === "custom"
    customFormat: {
        type: OptionType.STRING,
        description:
            "Custom banner format. Supported tokens: {label}, {version}, {hash}, {discord}",
        default: "{label} v{version} [{hash}]",
    },

    removeCloseButton: {
        type: OptionType.BOOLEAN,
        default: true,
        hidden: true,
        restartNeeded: true,
        description: "Remove dev banner close button",
    },
});

migratePluginSettings(PLUGIN_NAME, LEGACY_SETTINGS_ID);

function buildBannerText(discordBuild?: string): string {
    const { mode, customFormat } = settings.store;

    const tokens = {
        label: "eagleCord",
        version: VERSION,
        hash: gitHash,
        discord: discordBuild ?? "unknown",
    };

    switch (mode) {
        case "minimal":
            return tokens.label;

        case "default":
            return `${tokens.label} v${tokens.version}`;

        case "full":
            return `${tokens.label} v${tokens.version} [${tokens.hash}] discord:${tokens.discord}`;

        case "custom":
            return customFormat.replace(
                /\{(label|version|hash|discord)\}/g,
                (_, key) => tokens[key as keyof typeof tokens]
            );

        default:
            return tokens.label;
    }
}

export default definePlugin({
    name: PLUGIN_NAME,
    description:
        "Displays a customizable developer banner with EagleCord and Discord build information.",
    authors: [Devs.Eagle],
    settings,
    required: false,

    patches: [
        {
            find: ".devBanner,",
            replacement: [
                // Force-enable dev banner
                {
                    match: '"staging"===window.GLOBAL_ENV.RELEASE_CHANNEL',
                    replace: "true",
                },

                // Disable close button handler
                {
                    predicate: () => settings.store.removeCloseButton,
                    match: /(\i=\(\)=>)\(.*?\}\);/,
                    replace: "$1null;",
                },

                // Capture Discord build number and replace formatter
                {
                    match:
                        /\i\.\i\.format\(.{0,30},{buildNumber:(.{0,20})}\)/,
                    replace: "$self.transform($1)",
                },
            ],
        },
    ],

    transform(discordBuild?: string): string {
        return buildBannerText(discordBuild);
    },
});
