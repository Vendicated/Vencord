/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 nin0dev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { getUserSettingLazy } from "@api/UserSettings";
import { InfoIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { getCurrentChannel, getCurrentGuild } from "@utils/discord";
import definePlugin from "@utils/types";
import { GuildMember } from "@vencord/discord-types";
import { GuildMemberStore, GuildRoleStore, Menu, Parser } from "@webpack/common";

import { showInRoleModal } from "./RoleMembersModal";

const DeveloperMode = getUserSettingLazy("appearance", "developerMode")!;

function getMembersInRole(roleId: string, guildId: string) {
    const members = GuildMemberStore.getMembers(guildId);
    const membersInRole: GuildMember[] = [];
    members.forEach(member => {
        if (member.roles.includes(roleId)) {
            membersInRole.push(member);
        }
    });
    return membersInRole;
}

export default definePlugin({
    name: "InRole",
    description: "Know who is in a role with the role context menu or /inrole command (read plugin info!)",
    authors: [Devs.nin0dev],
    dependencies: ["UserSettingsAPI"],
    start() {
        // DeveloperMode needs to be enabled for the context menu to be shown
        DeveloperMode.updateSetting(true);
    },
    settingsAboutComponent: () => {
        return (
            <>
                <Paragraph style={{ fontSize: "1.2rem", marginTop: "15px", fontWeight: "bold" }}>{Parser.parse(":warning:")} Limitations</Paragraph>
                <Paragraph style={{ marginTop: "10px", fontWeight: "500" }} >If you don't have mod permissions on the server, and that server is large (over 100 members), the plugin may be limited in the following ways:</Paragraph>
                <Paragraph>• Offline members won't be listed</Paragraph>
                <Paragraph>• Up to 100 members will be listed by default. To get more, scroll down in the member list to load more members.</Paragraph>
                <Paragraph>• However, friends will always be shown regardless of their status.</Paragraph>
            </>
        );
    },

    commands: [
        {
            name: "inrole",
            description: "Know who is in a role",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "role",
                    description: "The role",
                    type: ApplicationCommandOptionType.ROLE,
                    required: true
                },
            ],
            execute: (args, ctx) => {
                // Guild check
                if (!ctx.guild) {
                    return sendBotMessage(ctx.channel.id, { content: "Make sure that you are in a server." });
                }
                const role = args[0].value;
                showInRoleModal(getMembersInRole(role, ctx.guild.id), role, ctx.channel.id);
            }
        }
    ],
    contextMenus: {
        "dev-context"(children, { id }: { id: string; }) {
            const guild = getCurrentGuild();
            if (!guild) return;

            const channel = getCurrentChannel();
            if (!channel) return;

            const role = GuildRoleStore.getRole(guild.id, id);
            if (!role) return;

            children.push(
                <Menu.MenuItem
                    id="vc-view-inrole"
                    label="View Members in Role"
                    action={() => {
                        showInRoleModal(getMembersInRole(role.id, guild.id), role.id, channel.id);
                    }}
                    icon={InfoIcon}
                />
            );
        },
        "message"(children, { message }: { message: any; }) {
            const guild = getCurrentGuild();
            if (!guild) return;

            const roleMentions = message.content.match(/<@&(\d+)>/g);
            if (!roleMentions?.length) return;

            const channel = getCurrentChannel();
            if (!channel) return;

            const roleIds = roleMentions.map(mention => mention.match(/<@&(\d+)>/)![1]);

            const role = GuildRoleStore.getRole(guild.id, roleIds);
            if (!role) return;

            children.push(
                <Menu.MenuItem
                    id="vc-view-inrole"
                    label="View Members in Role"
                    action={() => {
                        showInRoleModal(getMembersInRole(role.id, guild.id), role.id, channel.id);
                    }}
                    icon={InfoIcon}
                />
            );
        }
    }
});
