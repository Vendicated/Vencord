/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { ChannelStore, GuildMemberStore, GuildRoleStore, GuildStore, SelectedChannelStore, useStateFromStores } from "@webpack/common";

import { classifyStaff, StaffKind } from "./permissions";

const BotTagClasses = findCssClassesLazy("botTagVerified", "botTagRegular", "botText", "px", "rem");

const settings = definePluginSettings({
    memberList: {
        type: OptionType.BOOLEAN,
        description: "Show staff badges in the server member list.",
        default: true,
        restartNeeded: true
    },
    messages: {
        type: OptionType.BOOLEAN,
        description: "Show staff badges in server messages.",
        default: true,
        restartNeeded: true
    }
});

const labels: Record<StaffKind, string> = {
    owner: "OWNER",
    admin: "ADMIN",
    mod: "MOD",
    vcMod: "VC MOD"
};

const descriptions: Record<StaffKind, string> = {
    owner: "Server owner",
    admin: "Administrator permission",
    mod: "Message or member moderation permissions",
    vcMod: "Voice moderation: move, mute or deafen members"
};

function getStaffKind(guildId: string | undefined, userId: string | undefined, isBot: boolean): StaffKind | null {
    if (!guildId || !userId || isBot) return null;
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return null;
    if (guild.ownerId === userId) return "owner";

    const member = GuildMemberStore.getMember(guildId, userId);
    if (!member) return null;

    // Combine @everyone and all assigned roles, independent of their names.
    let permissions = 0n;
    for (const roleId of [guildId, ...member.roles]) {
        const value = GuildRoleStore.getRole(guildId, roleId)?.permissions;
        if (value != null) permissions |= BigInt(value);
    }
    return classifyStaff(permissions, false);
}

function StaffBadge({ guildId, userId, isBot = false, memberList = false }: {
    guildId?: string;
    userId?: string;
    isBot?: boolean;
    memberList?: boolean;
}) {
    const kind = useStateFromStores(
        [GuildStore, GuildMemberStore, GuildRoleStore, SelectedChannelStore, ChannelStore],
        () => getStaffKind(memberList
            ? ChannelStore.getChannel(SelectedChannelStore.getChannelId())?.guild_id
            : guildId, userId, isBot)
    );
    if (kind == null) return null;

    return (
        <span
            className={classes("vc-staff-badge", BotTagClasses.botTagRegular, BotTagClasses.px, BotTagClasses.rem)}
            title={descriptions[kind]}
            aria-label={`${labels[kind]} : ${descriptions[kind]}`}
            data-staff-kind={kind}
        >
            <span className={BotTagClasses.botText}>{labels[kind]}</span>
        </span>
    );
}

export default definePlugin({
    name: "StaffBadges",
    description: "Adds OWNER, ADMIN, MOD and VC MOD tags based on server permissions.",
    authors: [Devs.walidoudou],
    dependencies: ["MemberListDecoratorsAPI", "MessageDecorationsAPI"],
    settings,

    start() {
        if (settings.store.memberList) {
            addMemberListDecorator("StaffBadges", ({ user }) => (
                <StaffBadge userId={user?.id} isBot={user?.bot} memberList />
            ), "guilds");
        }
        if (settings.store.messages) {
            addMessageDecoration("StaffBadges", ({ channel, message }) => (
                <StaffBadge guildId={channel?.guild_id} userId={message?.author?.id} isBot={message?.author?.bot} />
            ));
        }
    },

    stop() {
        removeMemberListDecorator("StaffBadges");
        removeMessageDecoration("StaffBadges");
    }
});
