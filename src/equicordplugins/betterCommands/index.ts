/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    autoFillArguments: {
        description: "Automatically fill command with all arguements instead of just required ones",
        type: OptionType.BOOLEAN,
        default: true,
    },
    allowNewlinesInCommands: {
        description: "Allow newlines in command inputs (Shift + Enter)",
        type: OptionType.BOOLEAN,
        default: true,
    }
});

function fetchIndex(target: object) {
    FluxDispatcher.dispatch({
        type: "APPLICATION_COMMAND_INDEX_FETCH_REQUEST",
        target
    });
}

export default definePlugin({
    name: "BetterCommands",
    description: "Enhances the command system with miscellaneous improvements.",
    authors: [Devs.thororen],
    settings,
    patches: [
        {
            find: 'applicationCommand",',
            predicate: () => settings.store.autoFillArguments,
            replacement: [
                {
                    match: /\(\i\.required.{0,20}\]\)/,
                    replace: "true"
                },
            ]
        },
        {
            find: '"italics"),!0;',
            predicate: () => settings.store.allowNewlinesInCommands,
            replacement: [
                {
                    match: /case (\i\.\i)\.TAB:if\(null!=(\i).selection&&\i\((\i)(?=.{0,300}(\i\.\i\.insertText))/,
                    replace: (orig, keys, editor, event, insertText) => {
                        return `case ${keys}.ENTER:
                                    if(${event}.shiftKey){
                                        ${event}.preventDefault();
                                        ${event}.stopPropagation();
                                        ${insertText}(${editor},'\\n');
                                        return true;
                                    }
                                    break;
                                ${orig}`;
                    }
                }
            ]
        }
    ],
    commands: [
        {
            name: "refresh",
            description: "Refreshes Discord application commands locally",
            options: [
                {
                    name: "user",
                    description: "specific user to try and refresh",
                    type: ApplicationCommandOptionType.USER,
                }
            ],
            inputType: ApplicationCommandInputType.BOT,
            execute: async (opts, ctx) => {
                try {
                    const channelId = ctx.channel.id;
                    const guildId = ctx.guild?.id;
                    const user = findOption(opts, "user") as string;

                    sendBotMessage(ctx.channel.id, {
                        content: "Refreshing application commands...",
                    });

                    fetchIndex({ type: "channel", channelId });

                    if (guildId) fetchIndex({ type: "guild", guildId });

                    if (user) {
                        const target = await UserStore.getUser(user);
                        fetchIndex(
                            target.bot
                                ? { type: "application", applicationId: target.id }
                                : { type: "user" }
                        );
                    }

                    sendBotMessage(ctx.channel.id, {
                        content: "Commands refreshed successfully!",
                    });
                } catch (err) {
                    console.error("[Refresh Command] Error refreshing commands:", err);
                    sendBotMessage(ctx.channel.id, {
                        content: "Failed to refresh commands. Check the console for details.",
                    });
                }
            },
        },
    ]
});
