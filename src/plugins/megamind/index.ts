/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findOption, RequiredMessageOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    capitalize: {
        type: OptionType.BOOLEAN,
        description: "Automatically capitalize the input.",
        default: true
    }
});

function getURL(message: string): string {
    if (settings.store.capitalize) {
        message = message.toUpperCase();
    }
    return `https://api.no-bitch.es/${encodeURIComponent(message)}`;
}

export default definePlugin({
    name: "Megamind",
    description: "Generate Megamind images with api.no-bitch.es",
    nexulien: true,
    authors: [Devs.Zoid],

    settings,

    commands: [
        {
            name: "megamind",
            description: "Creates a Megamind image.",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: getURL(findOption(opts, "message", ""))
            })
        },
    ]
});

