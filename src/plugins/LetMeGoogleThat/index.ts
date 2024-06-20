/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandOptionType, findOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

function letMeGoogleThat(message) {
    return settings.store.defaultUrl + encodeURIComponent(message);
}

const settings = definePluginSettings({
    defaultUrl: {
        type: OptionType.STRING,
        default: "https://letmegooglethat.vercel.app?q=",
        description: "Default url - RECOMMEND NOT CHANGING UNLESS YOU KNOW WHAT YOU ARE DOING!",
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "LetMeGoogleThat",
    description: "Makes a let me google that command!",
    authors: [Devs.Abstractmelon, Devs.UnluckyCrafter],
    dependencies: ["CommandsAPI"],
    settings,
    commands: [
        {
            name: "letmegooglethat",
            description: "Creates a let me google that link and send it!",
            options: [
                {
                    name: "query",
                    description: "What you want to google!",
                    required: false,
                    type: ApplicationCommandOptionType.STRING,
                },
            ],
            execute: opts => ({
                content: letMeGoogleThat(findOption(opts, "query", ""))
            }),
        }
    ]
});
