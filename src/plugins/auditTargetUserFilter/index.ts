/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { ApplicationCommandInputType, ApplicationCommandOptionType, registerCommand, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { GuildStore, PermissionsBits, PermissionStore, SelectedGuildStore } from "@webpack/common";

import { Webpack } from "../../Vencord";

let apply_target_id: string | null = null;

export default definePlugin({
    name: "AuditTargetUserFilter",
    authors: [Devs.Pixeluted],
    description: "Adds a command to filter server audit logs by a specific target user.",
    patches: [
        {
            find: "AuditLogClickWrap",
            replacement: {
                match: /(function \w+\(\w+,\w+\)\{let (\w+)=function\(\w+\)\{[\s\S]+?\}\(\w+\);)(return [\w.]+\.get\(\{url:[\w.]+\.GUILD_AUDIT_LOG\(\w+\),query:\2[^}]*\}\))/,
                replace: "$1 $self.modify_audit_query($2); $3"
            }
        }
    ],

    start() {
        registerCommand({
            name: "view_audit_logs_of_target_user",
            description: "Opens the audit log window, filtered to only show actions affecting the specified user.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "target_user",
                    description: "The target user to filter the audit logs by.",
                    type: ApplicationCommandOptionType.USER,
                    required: true
                }
            ],

            execute: async (args, { channel }) => {
                if (SelectedGuildStore.getGuildId() === null) {
                    sendBotMessage(channel.id, {
                        content: "This command can only be used within a server."
                    });
                    return;
                }

                if (!PermissionStore.can(PermissionsBits.VIEW_AUDIT_LOG, GuildStore.getGuild(channel.guild_id))) {
                    sendBotMessage(channel.id, {
                        content: "You do not have permission to view the audit log in this server."
                    });
                    return;
                }

                apply_target_id = args[0].value;

                Webpack.findByProps("open", "updateGuild", "saveGuild").open(channel.guild_id, "AUDIT_LOG");
            },
        }, "AuditTargetUserFilter");
    },

    modify_audit_query(query: any) {
        if (apply_target_id) {
            query.target_id = apply_target_id;
            apply_target_id = null;
        }
    }
});
