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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginSettingDef } from "@utils/types";

const opt = (description: string) => ({
    type: OptionType.BOOLEAN,
    description,
    default: true,
    restartNeeded: true
} satisfies PluginSettingDef);

const settings = definePluginSettings({
    showTimeouts: opt("Show member timeout icons in chat."),
    showInvitesPaused: opt("Show the invites paused tooltip in the server list."),
    showModView: opt("Show the member mod view context menu item in all servers."),
    showMembersPageInSettings: opt("Shows the member page in the settings of non-community servers even if Show Members in Channel List is enabled, and disable the redirect to the sidebar in community servers."),
    showMembersPageInSidebar: opt("Shows the member page in sidebar of non-community servers regardless of the Show Members in Channel List setting."),
});

export default definePlugin({
    name: "ShowHiddenThings",
    tags: ["ShowTimeouts", "ShowInvitesPaused", "ShowModView", "DisableDiscoveryFilters", "ShowMembersPage"],
    description: "Displays various hidden & moderator-only things regardless of permissions.",
    authors: [Devs.Dolfies, Devs.Sqaaakoi],
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
            find: /context:\i,checkElevated:!1\}\),\i\.\i.{0,200}autoTrackExposure/,
            predicate: () => settings.store.showModView,
            replacement: {
                match: /return \i\.\i\(\i\.\i\(\{user:\i,context:\i,checkElevated:!1\}\),\i\.\i\)/,
                replace: "return true",
            }
        },
        // fixes a bug where Members page must be loaded to see highest role, why is Discord depending on MemberSafetyStore.getEnhancedMember for something that can be obtained here?
        {
            find: "#{intl::GUILD_MEMBER_MOD_VIEW_PERMISSION_GRANTED_BY_ARIA_LABEL}",
            predicate: () => settings.store.showModView,
            replacement: {
                match: /(role:)\i(?=,guildId.{0,100}role:(\i\[))/,
                replace: "$1$2arguments[0].member.highestRoleId]",
            }
        },
        // allows you to open mod view on yourself
        {
            find: ".MEMBER_SAFETY,{modViewPanel:",
            predicate: () => settings.store.showModView,
            replacement: {
                match: /\i(?=\?null)/,
                replace: "false"
            }
        },
        {
            find: ".GUILD_SETTINGS_MEMBERS_PAGE),",
            predicate: () => settings.store.showMembersPageInSettings,
            replacement: {
                match: /\i\.hasFeature\(\i\.\i\.ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY\)/,
                replace: "false"
            }
        },
        // disable redirect to sidebar
        {
            find: /\i\.isCommunity\(\).{0,300}WindowLaunchIcon/,
            predicate: () => settings.store.showMembersPageInSettings,
            replacement: {
                match: /\i\.isCommunity\(\)/,
                replace: "false"
            }
        },
        {
            find: /ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY.{0,500}GUILD_MOD_DASH_MEMBER_SAFETY/,
            predicate: () => settings.store.showMembersPageInSidebar,
            replacement: {
                match: /\i\.hasFeature\(\i\.\i\.ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY\)/,
                replace: "true"
            }
        },
        // discord, why does this check have to exist?
        {
            find: 'type:"INITIALIZE_MEMBER_SAFETY_STORE"',
            predicate: () => settings.store.showMembersPageInSidebar,
            replacement: {
                match: /\i\.hasFeature\(\i\.\i\.ENABLED_MODERATION_EXPERIENCE_FOR_NON_COMMUNITY\)/,
                replace: "true"
            }
        },
    ]
});
