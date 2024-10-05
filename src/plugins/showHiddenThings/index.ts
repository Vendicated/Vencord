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

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
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
    disableDiscoveryFilters: opt("Disable filters in Server Discovery search that hide servers that don't meet discovery criteria."),
    disableDisallowedDiscoveryFilters: opt("Disable filters in Server Discovery search that hide NSFW & disallowed servers."),
});

migratePluginSettings("ShowHiddenThings", "ShowTimeouts");
export default definePlugin({
    name: "ShowHiddenThings",
    tags: ["ShowTimeouts", "ShowInvitesPaused", "ShowModView", "DisableDiscoveryFilters"],
    description: "Displays various hidden & moderator-only things regardless of permissions.",
    authors: [Devs.Dolfies],
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
            find: "Messages.GUILD_MEMBER_MOD_VIEW_PERMISSION_GRANTED_BY_ARIA_LABEL,allowOverflow",
            predicate: () => settings.store.showModView,
            replacement: {
                match: /(role:)\i(?=,guildId.{0,100}role:(\i\[))/,
                replace: "$1$2arguments[0].member.highestRoleId]",
            }
        },
        {
            find: "prod_discoverable_guilds",
            predicate: () => settings.store.disableDiscoveryFilters,
            replacement: {
                match: /\{"auto_removed:.*?\}/,
                replace: "{}"
            }
        },
        // remove the 200 server minimum
        {
            find: '">200"',
            predicate: () => settings.store.disableDiscoveryFilters,
            replacement: {
                match: '">200"',
                replace: '">0"'
            }
        },
        // empty word filter
        {
            find: '"pepe","nude"',
            predicate: () => settings.store.disableDisallowedDiscoveryFilters,
            replacement: {
                match: /(?<=[?=])\["pepe",.+?\]/,
                replace: "[]",
            },
        },
        // patch request that queries if term is allowed
        {
            find: ".GUILD_DISCOVERY_VALID_TERM,query:",
            predicate: () => settings.store.disableDisallowedDiscoveryFilters,
            all: true,
            replacement: {
                match: /\i\.\i\.get\(\{url:\i\.\i\.GUILD_DISCOVERY_VALID_TERM,query:\{term:\i\},oldFormErrors:!0\}\)/g,
                replace: "Promise.resolve({ body: { valid: true } })"
            }
        }
    ],
    settings,
});
