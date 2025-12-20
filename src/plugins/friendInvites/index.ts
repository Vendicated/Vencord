/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const FriendInvites = findByPropsLazy("createFriendInvite");

export default definePlugin({
    name: "FriendInvites",
    description: "Create and manage friend invite links via slash commands (/create friend invite, /view friend invites, /revoke friend invites).",
    authors: [Devs.afn, Devs.Dziurwa],
    commands: [
        {
            name: "create friend invite",
            description: "Generates a friend invite link.",
            inputType: ApplicationCommandInputType.BUILT_IN,

            execute: async (args, ctx) => {
                const invite = await FriendInvites.createFriendInvite();

                sendBotMessage(ctx.channel.id, {
                    content: `
                        discord.gg/${invite.code} ·
                        Expires: <t:${new Date(invite.expires_at).getTime() / 1000}:R> ·
                        Max uses: \`${invite.max_uses}\`
                    `.trim().replace(/\s+/g, " ")
                });
            }
        },
        {
            name: "view friend invites",
            description: "View a list of all generated friend invites.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                const invites = await FriendInvites.getAllFriendInvites();
                const friendInviteList = invites.map(i =>
                    `
                    _discord.gg/${i.code}_ ·
                    Expires: <t:${new Date(i.expires_at).getTime() / 1000}:R> ·
                    Times used: \`${i.uses}/${i.max_uses}\`
                    `.trim().replace(/\s+/g, " ")
                );

                sendBotMessage(ctx.channel.id, {
                    content: friendInviteList.join("\n") || "You have no active friend invites!"
                });
            },
        },
        {
            name: "revoke friend invites",
            description: "Revokes all generated friend invites.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                await FriendInvites.revokeFriendInvites();

                sendBotMessage(ctx.channel.id, {
                    content: "All friend invites have been revoked."
                });
            },
        },
    ]
});
