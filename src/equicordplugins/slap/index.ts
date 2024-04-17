/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, Korbo, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

export default definePlugin({
    name: "Slap",
    description: "Adds a command from the land before Discord.",
    authors: [Devs.Korbo],
    commands: [{
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        name: "slap",
        description: "Slap someone/something.",
        options: [{
            name: "victim",
            description: "Thing to slap",
            required: true,
            type: ApplicationCommandOptionType.STRING,
        }],
        execute: async ([{ value: victim }], ctx) => {
            return { content: `<@${UserStore.getCurrentUser().id}> slaps ${victim} around a bit with a large trout` };
        }
    }]
});
