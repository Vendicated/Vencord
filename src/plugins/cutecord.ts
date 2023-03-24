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

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";


const settings = definePluginSettings({
    allowSilent: {
        description: "Allow notifications from silent messages",
        type: OptionType.BOOLEAN,
        default: false
    },
    allowGroupDMRemove: {
        description: "Allow notifications for group DM removals",
        type: OptionType.BOOLEAN,
        default: false
    },
    allowSpammers: {
        description: "Allow notifications from spammer accounts",
        type: OptionType.BOOLEAN,
        default: false
    },
    allowLurkedGuilds: {
        description: "Allow notifications from guilds that you are lurking",
        type: OptionType.BOOLEAN,
        default: false
    },
    allowBlockedUsers: {
        description: "Allow notifications from blocked users",
        type: OptionType.BOOLEAN,
        default: false
    }
});
export default definePlugin({
    name: "Cutecord",
    description: "Cuter notification settings",
    authors: [Devs.katlyn],
    patches: [{
        find: ".RECIPIENT_REMOVE)",
        replacement: {
            match: /null!=\i.flags.{0,30}SUPPRESS_NOTIFICATIONS\)/,
            replace: "$& && !$self.settings.store.allowSilent"
        }
    }, {
        find: ".RECIPIENT_REMOVE)",
        replacement: {
            match: /\i\.type.{5,10}RECIPIENT_REMOVE/,
            replace: "!$self.settings.store.allowGroupDMRemove && $&"
        }
    }, {
        find: ".RECIPIENT_REMOVE)",
        replacement: {
            match: /\i\.hasFlag\(.{2,10}SPAMMER/,
            replace: "!$self.settings.store.allowSpammers && $&"
        }
    }, {
        find: ".RECIPIENT_REMOVE)",
        replacement: {
            match: /\i\.\i\.isLurking\(\i\)/,
            replace: "($& && !$self.settings.store.allowLurkedGuilds)"
        }
    }, {
        find: ".RECIPIENT_REMOVE)",
        replacement: {
            // Global to replace both occurrences of the isBlocked check within the module
            match: /\i\.\i\.isBlocked\(\i\.id\)/g,
            replace: "($& && !$self.settings.store.allowBlockedUsers)"
        }
    }],
    settings
});
