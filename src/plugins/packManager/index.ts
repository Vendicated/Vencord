/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { isNonNullish, isTruthy } from "@utils/guards";
import definePlugin from "@utils/types";
import { InventoryStore, RestAPI, UserStore } from "@webpack/common";

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
                match: /(?<=_isADuplicateGuildPack=\s*function\s*\(\i\)\s*\{)/,
                replace: "return false;"
            }
        }
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

                const { premiumType } = UserStore.getCurrentUser();
                const packLimit = isTruthy(premiumType) ? 100 : 1;

                if (InventoryStore.countPacksCollected() >= packLimit) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "You have reached the pack limit, you'll have to remove a pack before adding another!"
                    });
                }

                if (isNonNullish(InventoryStore.getPackByPackId(guildId))) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "This pack is already in your inventory."
                    });
                }

                try {
                    const { body: { name } } = await RestAPI.put({
                        url: "/users/@me/inventory/packs/add",
                        body: {
                            pack_id: guildId,
                        }
                    });

                    return sendBotMessage(ctx.channel.id, {
                        content: `Pack ${name} added to inventory.`
                    });
                } catch {
                    return sendBotMessage(ctx.channel.id, {
                        content: "An error occured while adding the pack..."
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

                const hasCollected = isNonNullish(InventoryStore.getPackByPackId(guildId));

                if (!hasCollected) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "You haven't added this pack to your inventory!"
                    });
                }

                try {
                    await RestAPI.put({
                        url: "/users/@me/inventory/packs/remove",
                        body: {
                            pack_id: guildId,
                        }
                    });

                    return sendBotMessage(ctx.channel.id, {
                        content: "Pack removed from inventory."
                    });
                } catch {
                    return sendBotMessage(ctx.channel.id, {
                        content: "An error occured while removing the pack..."
                    });
                }
            },
        }
    ]
});
