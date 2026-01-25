/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginSettingDef } from "@utils/types";
import { GuildMember, Role } from "@vencord/discord-types";

const opt = (description: string) => ({
    type: OptionType.BOOLEAN,
    description,
    default: true,
    restartNeeded: true
} satisfies PluginSettingDef);

const settings = definePluginSettings({
    showTimeouts: opt("Show member timeout icons in chat."),
    showInvitesPaused: opt("Show the invites paused tooltip in the server list."),
    showModView: opt("Show the member mod view context menu item in all servers.")
});

export default definePlugin({
    name: "ShowHiddenThings",
    tags: ["ShowTimeouts", "ShowInvitesPaused", "ShowModView", "DisableDiscoveryFilters"],
    description: "Displays various hidden & moderator-only things regardless of permissions.",
    authors: [Devs.Dolfies],
    settings,

    patches: [
        {
            find: "showCommunicationDisabledStyles",
            predicate: () => settings.store.showTimeouts,
            replacement: {
                match: /&&\i\.\i\.canManageUser\(\i\.\i\.MODERATE_MEMBERS,\i\.author,\i\)/,
                replace: "",
            },
        },
        {
            find: "INVITES_DISABLED))||",
            predicate: () => settings.store.showInvitesPaused,
            replacement: {
                match: /\i\.\i\.can\(\i\.\i.MANAGE_GUILD,\i\)/,
                replace: "true",
            },
        },
        {
            find: /,checkElevated:!1}\),\i\.\i\)}(?<=getCurrentUser\(\);return.+?)/,
            predicate: () => settings.store.showModView,
            replacement: {
                match: /return \i\.\i\(\i\.\i\(\{user:\i,context:\i,checkElevated:!1\}\),\i\.\i\)/,
                replace: "return true",
            }
        },
        // fixes a bug where Members page must be loaded to see highest role, why is Discord depending on MemberSafetyStore.getEnhancedMember for something that can be obtained here?
        {
            find: "#{intl::GUILD_MEMBER_MOD_VIEW_HIGHEST_ROLE}),children:",
            predicate: () => settings.store.showModView,
            replacement: {
                match: /(#{intl::GUILD_MEMBER_MOD_VIEW_HIGHEST_ROLE}.{0,80})role:\i(?<=\[\i\.roles,\i\.highestRoleId,(\i)\].+?)/,
                replace: (_, rest, roles) => `${rest}role:$self.getHighestRole(arguments[0],${roles})`,
            }
        },
        // allows you to open mod view on yourself
        {
            find: 'action:"PRESS_MOD_VIEW",icon:',
            predicate: () => settings.store.showModView,
            replacement: {
                match: /\i(?=\?null)/,
                replace: "false"
            }
        }
    ],

    getHighestRole({ member }: { member: GuildMember; }, roles: Role[]): Role | undefined {
        try {
            return roles.find(role => role.id === member.highestRoleId);
        } catch (e) {
            new Logger("ShowHiddenThings").error("Failed to find highest role", e);
            return undefined;
        }
    }
});
