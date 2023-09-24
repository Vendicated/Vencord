/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
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
            options: [{
                name: "Uses",
                description: "How many uses?",
                choices: [
                    { label: "1", name: "1", value: "1" },
                    { label: "5", name: "5", value: "5" }
                ],
                required: false,
                type: ApplicationCommandOptionType.INTEGER
            }],

            execute: async (args, ctx) => {
                const uses = findOption<number>(args, "Uses", 5);

                if (uses === 1 && !UserStore.getCurrentUser().phone)
                    return sendBotMessage(ctx.channel.id, {
                        content: "You need to have a phone number connected to your account to create a friend invite with 1 use!"
                    });

                let invite: any;
                if (uses === 1) {
                    const random = uuid.v4();
                    const { body: { invite_suggestions } } = await RestAPI.post({
                        url: "/friend-finder/find-friends",
                        body: {
                            modified_contacts: {
                                [random]: [1, "", ""]
                            },
                            phone_contact_methods_count: 1
                        }
                    });
                    invite = await FriendInvites.createFriendInvite({
                        code: invite_suggestions[0][3],
                        recipient_phone_number_or_email: random,
                        contact_visibility: 1,
                        filter_visibilities: [],
                        filtered_invite_suggestions_index: 1
                    });
                } else {
                    invite = await FriendInvites.createFriendInvite();
                }

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

                sendBotMessage(ctx.channel.id, {
                    content: "All friend invites have been revoked."
                });
            },
        },
    ]
});
