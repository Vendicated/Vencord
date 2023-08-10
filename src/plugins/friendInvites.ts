/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { RestAPI, UserStore } from "@webpack/common";

const FriendInvites = findByPropsLazy("createFriendInvite");
const uuid = findByPropsLazy("v4", "v1");

export default definePlugin({
    name: "FriendInvites",
    description: "Create and manage friend invite links via slash commands (/create friend invite, /view friend invites, /revoke friend invites).",
    authors: [Devs.afn, Devs.Dziurwa],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "create friend invite",
            description: "Generates a friend invite link.",
            inputType: ApplicationCommandInputType.BOT,
            execute: async (_, ctx) => {
                if (!UserStore.getCurrentUser().phone)
                    return sendBotMessage(ctx.channel.id, {
                        content: "You need to have a phone number connected to your account to create a friend invite!"
                    });

                const random = uuid.v4();
                const invite = await RestAPI.post({
                    url: "/friend-finder/find-friends",
                    body: {
                        modified_contacts: {
                            [random]: [1, "", ""]
                        },
                        phone_contact_methods_count: 1
                    }
                }).then(res =>
                    FriendInvites.createFriendInvite({
                        code: res.body.invite_suggestions[0][3],
                        recipient_phone_number_or_email: random,
                        contact_visibility: 1,
                        filter_visibilities: [],
                        filtered_invite_suggestions_index: 1
                    })
                );

                sendBotMessage(ctx.channel.id, {
                    content: `
                        discord.gg/${invite.code} ·
                        Expires: <t:${new Date(invite.expires_at).getTime() / 1000}:R> ·
                        Max uses: \`${invite.max_uses}\`
                    `.trim().replace(/\s+/g, " ")
                });
            },
        },
        {
            name: "view friend invites",
            description: "View a list of all generated friend invites.",
            inputType: ApplicationCommandInputType.BOT,
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
            inputType: ApplicationCommandInputType.BOT,
            execute: async (_, ctx) => {
                await FriendInvites.revokeFriendInvites();

                return void sendBotMessage(ctx.channel.id, {
                    content: "All friend invites have been revoked."
                });
            },
        },
    ]
});
