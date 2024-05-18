/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";


const typing = findByPropsLazy("startTyping");

async function typeForever(seconds: number, ctx: any) {
    for (let i = 0; i < seconds; i += 5) {
        typing.startTyping(ctx.channel.id);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    typing.stopTyping(ctx.channel.id);
}


export default definePlugin({
    name: "TypeForever!",
    description: "Type for any amount of time with a slash command",
    authors: [{
        id: 1095427026413965364n,
        name: "VilariStorms"
    }],
    dependencies: ["CommandsAPI"],
    commands: [{
        name: "TypeForever",
        description: "Type forever!",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [{
            name: "seconds",
            description: "Number of seconds to type for",
            type: ApplicationCommandOptionType.INTEGER,
            required: true
        }],
        execute: async (_, ctx) => {
            var count = findOption(_, "seconds", "");
            const seconds: number = Number(count);
            if (seconds > 0 && seconds < 6000) {
                typeForever(seconds, ctx);

            } else {
                console.log("Invalid number of seconds");
            }

        }
    }]
});
