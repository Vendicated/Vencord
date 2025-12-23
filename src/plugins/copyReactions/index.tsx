/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, RestAPI, Toasts } from "@webpack/common";


interface User {
    id: string;
    username: string;
    global_name?: string | null;
}

export default definePlugin({
    name: "CopyReactionsAsJSON",
    description: "Adds a context menu option to copy message reactions with individual users as JSON",
    authors: [Devs.Rames507],

    contextMenus: {
        "message": (children, props) => {
            const { message } = props;

            if (!message.reactions || message.reactions.length === 0) {
                return;
            }

            children.push(
                <Menu.MenuItem
                    id="copy-reactions-json"
                    label="Copy Reactions as JSON"
                    action={async () => {
                        try {
                            Toasts.show({
                                message: "Fetching reaction data...",
                                type: Toasts.Type.MESSAGE,
                                id: "fetch-reactions"
                            });

                            const reactionsData = await Promise.all(
                                message.reactions.map(async reaction => {
                                    const emojiParam = reaction.emoji.id
                                        ? `${reaction.emoji.name}:${reaction.emoji.id}`
                                        : encodeURIComponent(reaction.emoji.name);

                                    try {
                                        const response = await RestAPI.get({
                                            url: `/channels/${message.channel_id}/messages/${message.id}/reactions/${emojiParam}`,
                                            query: {
                                                limit: 100
                                            }
                                        });

                                        const users = response.body.map((user: User) => ({
                                            id: user.id,
                                            username: user.username,
                                            displayName: user.global_name || user.username
                                        }));

                                        return {
                                            emoji: {
                                                id: reaction.emoji.id,
                                                name: reaction.emoji.name,
                                                animated: reaction.emoji.animated || false,
                                                formatted: reaction.emoji.id
                                                    ? `<${reaction.emoji.animated ? "a" : ""}:${reaction.emoji.name}:${reaction.emoji.id}>`
                                                    : reaction.emoji.name
                                            },
                                            count: reaction.count,
                                            users: users
                                        };
                                    } catch (error) {
                                        console.error(`Error fetching users for emoji ${reaction.emoji.name}:`, error);
                                        return {
                                            emoji: {
                                                id: reaction.emoji.id,
                                                name: reaction.emoji.name,
                                                animated: reaction.emoji.animated || false,
                                                formatted: reaction.emoji.id
                                                    ? `<${reaction.emoji.animated ? "a" : ""}:${reaction.emoji.name}:${reaction.emoji.id}>`
                                                    : reaction.emoji.name
                                            },
                                            count: reaction.count,
                                            users: [],
                                            error: "Failed to fetch users"
                                        };
                                    }
                                })
                            );

                            const jsonOutput = JSON.stringify({
                                messageId: message.id,
                                channelId: message.channel_id,
                                reactions: reactionsData,
                                totalReactions: reactionsData.reduce((sum, r) => sum + r.count, 0),
                                totalUniqueUsers: new Set(
                                    reactionsData.flatMap(r => r.users.map(u => u.id))
                                ).size
                            }, null, 2);

                            navigator.clipboard.writeText(jsonOutput);
                            Toasts.show({
                                message: "Reactions copied to clipboard!",
                                type: Toasts.Type.SUCCESS,
                                id: Toasts.genId()
                            });
                        } catch (error) {
                            Toasts.show({
                                message: "Failed to copy reactions",
                                type: Toasts.Type.FAILURE,
                                id: Toasts.genId()
                            });
                            console.error("Error copying reactions:", error);
                        }
                    }}
                />
            );
        }
    }
});
