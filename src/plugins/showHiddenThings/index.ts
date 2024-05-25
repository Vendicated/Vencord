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
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    showTimeouts: {
        type: OptionType.BOOLEAN,
        description: "Show member timeout icons in chat.",
        default: true,
    },
    showInvitesPaused: {
        type: OptionType.BOOLEAN,
        description: "Show the invites paused tooltip in the server list.",
        default: true,
    },
    showModView: {
        type: OptionType.BOOLEAN,
        description: "Show the member mod view context menu item in all servers.",
        default: true,
    },
    disableDiscoveryFilters: {
        type: OptionType.BOOLEAN,
        description: "Disable filters in Server Discovery search that hide servers that don't meet discovery criteria.",
        default: true,
    },
    disableDisallowedDiscoveryFilters: {
        type: OptionType.BOOLEAN,
        description: "Disable filters in Server Discovery search that hide NSFW & disallowed servers.",
        default: true,
    },
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
            find: "useShouldShowInvitesDisabledNotif:",
            predicate: () => settings.store.showInvitesPaused,
            replacement: {
                match: /\i\.\i\.can\(\i\.Permissions.MANAGE_GUILD,\i\)/,
                replace: "true",
            },
        },
        {
            find: "canAccessGuildMemberModViewWithExperiment:",
            predicate: () => settings.store.showModView,
            replacement: {
                match: /return \i\.hasAny\(\i\.computePermissions\(\{user:\i,context:\i,checkElevated:!1\}\),\i\.MemberSafetyPagePermissions\)/,
                replace: "return true",
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
        {
            find: "MINIMUM_MEMBER_COUNT:",
            predicate: () => settings.store.disableDiscoveryFilters,
            replacement: {
                match: /MINIMUM_MEMBER_COUNT:function\(\)\{return \i}/,
                replace: "MINIMUM_MEMBER_COUNT:() => \">0\""
            }
        },
        {
            find: "DiscoveryBannedSearchWords.includes",
            predicate: () => settings.store.disableDisallowedDiscoveryFilters,
            replacement: {
                match: /(?<=function\(\){)(?=.{0,130}DiscoveryBannedSearchWords\.includes)/,
                replace: "return false;"
            }
        },
        {
            find: "Endpoints.GUILD_DISCOVERY_VALID_TERM",
            predicate: () => settings.store.disableDisallowedDiscoveryFilters,
            all: true,
            replacement: {
                match: /\i\.HTTP\.get\(\{url:\i\.Endpoints\.GUILD_DISCOVERY_VALID_TERM,query:\{term:\i\},oldFormErrors:!0\}\);/g,
                replace: "Promise.resolve({ body: { valid: true } });"
            }
        }
    ],
    settings,
});
