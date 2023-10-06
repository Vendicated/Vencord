/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { InventoryStore } from "@webpack/common";

import * as PackManager from "./packManager";
import TabComponent from "./TabComponent";

export default definePlugin({
    name: "PackManager",
    description: "(Un)claim packs with slash commands, and additional UI patches for supporting packs for joined servers.",
    authors: [Devs.arHSM],
    dependencies: ["CommandsAPI"],
    patches: [
        // Patch to enable usage of packs for servers which the user has joined
        // This does lead to a messy UI
        // - The server is listed twice
        // - The pack listing has the same emojis mentioned twice (one is usable and other gives the nitro screen (if non-nitro))
        {
            find: "InventoryStore",
            replacement: {
                match: /(?<=_isADuplicateGuildPack=function\(\i\)\{)/,
                replace: "return false;"
            }
        },
        // Add "Packs" tab in the gif/sticker/emoji/sound picker tab
        {
            find: ".Messages.EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL,",
            replacement: [
                {
                    match: /(?<=(\(0,\i\.jsx\)\(\i,{id:\i\.\i,"aria-controls":\i\.\i),"aria-selected":(\i)===.+?,children:\i.\i.Messages.EXPRESSION_PICKER_EMOJI}\))/,
                    replace(original, template, currentTab) {
                        const tabId = "PACKS";
                        const condition = `${currentTab} === "${tabId}"`;
                        // Replace ID (a11y)
                        const templateFixed = template.replace(/(?<=id:)\i.\i/, "packs-picker-tab");

                        return `${original}, ${templateFixed}, "aria-selected": ${condition}, isActive: ${condition}, viewType: "${tabId}", children: "Packs"})`;
                    }
                },
                {
                    match: /(?<=null,)(?=(\i)===\i.\i.SOUNDBOARD)/,
                    replace: "$1===\"PACKS\" ? $self.TabComponent() : null,"
                }
            ]
        },
    ],
    commands: [
        {
            name: "pack add",
            description: "Collect a pack with the given guild ID",
            inputType: ApplicationCommandInputType.BOT,
            options: [{
                name: "Guild ID",
                description: "The guild ID to claim the pack from",
                required: true,
                type: ApplicationCommandOptionType.STRING,
            }],

            async execute(args, ctx) {
                const guildId = findOption<string>(args, "Guild ID")!;

                try {
                    const content = await PackManager.addPack(guildId);
                    return sendBotMessage(ctx.channel.id, { content });
                } catch (e) {
                    return sendBotMessage(ctx.channel.id, {
                        content: (e as Error).message
                    });
                }
            },
        },
        {
            name: "pack remove",
            description: "Uncollect a pack with the given guild ID",
            inputType: ApplicationCommandInputType.BOT,
            options: [{
                name: "Guild ID",
                description: "The guild ID to unclaim the pack from",
                required: true,
                type: ApplicationCommandOptionType.STRING,
            }],

            async execute(args, ctx) {
                const guildId = findOption<string>(args, "Guild ID")!;

                try {
                    const content = await PackManager.removePack(guildId);
                    return sendBotMessage(ctx.channel.id, { content });
                } catch (e) {
                    return sendBotMessage(ctx.channel.id, {
                        content: (e as Error).message
                    });
                }
            },
        },
        {
            name: "pack list",
            description: "List all packs in your inventory",
            inputType: ApplicationCommandInputType.BOT,

            async execute(_, ctx) {
                const content = InventoryStore.getPacksForUser().map(pack => {
                    return `${pack.name} (\`${pack.id}\`): ${pack.content.emojis.length} emojis`;
                }).join("\n");

                return sendBotMessage(ctx.channel.id, {
                    content,
                });
            },
        }
    ],

    TabComponent() {
        return <TabComponent></TabComponent>;
    }
});
