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
        // 1. The server is listed twice
        // 2. The pack listing has the same emojis mentioned twice (one is usable and other gives the nitro screen (if non-nitro))
        {
            find: "InventoryStore",
            replacement: {
                match: /(?<=_isADuplicateGuildPack\(\i\)\{)/,
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
                        const tabId = "packs";
                        const condition = `${currentTab} === "${tabId}"`;
                        // Replace ID (a11y)
                        const templateFixed = template.replace(/(?<=id:)\i.\i/, "packs-picker-tab");

                        return `${original}, ${templateFixed}, "aria-selected": ${condition}, isActive: ${condition}, viewType: "${tabId}", children: "Packs"})`;
                    }
                },
                {
                    match: /(?<=null,)(?=(\i)===\i.\i.SOUNDBOARD)/,
                    replace: "$1===\"packs\" ? $self.TabComponent() : null,"
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
                const packsCount = InventoryStore.countPacksCollected();

                if (packsCount === 0) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "You dont have any packs yet."
                    });
                }

                const content = InventoryStore.getPacksForUser().map(pack => {
                    return `- ${pack.name} (\`${pack.id}\`): ${pack.content.emojis.length} Emojis · ${pack.content.emojis.filter(e => e.animated).length} Animated`;
                }).join("\n");

                return sendBotMessage(ctx.channel.id, {
                    content: `Here's a list of your ${packsCount > 1 ? packsCount + " " : ""}packs:\n${content}`,
                });
            },
        }
    ],
    TabComponent() {
        return <TabComponent></TabComponent>;
    }
});
