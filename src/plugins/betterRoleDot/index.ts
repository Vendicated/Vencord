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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    bothStyles: {
        type: OptionType.BOOLEAN,
        description: "Show both role dot and coloured names",
        restartNeeded: true,
        default: false,
    },
    copyRoleColorInProfilePopout: {
        type: OptionType.BOOLEAN,
        description: "Allow click on role dot in profile popout to copy role color",
        restartNeeded: true,
        default: false
    },
});

export default definePlugin({
    name: "BetterRoleDot",
    authors: [Devs.Ven, Devs.AutumnVN],
    description: "Copy role colour on RoleDot (accessibility setting) click. Also allows using both RoleDot and coloured names simultaneously",
    settings,

    patches: [
        {
            // Class used in this module is dotBorderBase
            find: "M0 4C0 1.79086 1.79086 0 4 0H16C18.2091 0 20 1.79086 20 4V16C20 18.2091 18.2091 20 16 20H4C1.79086 20 0 18.2091 0 16V4Z",
            replacement: {
                match: /,viewBox:"0 0 20 20"/,
                replace: "$&,onClick:()=>$self.copyToClipBoard(arguments[0].color),style:{cursor:'pointer'}",
            },
        },
        {
            find: '"dot"===',
            all: true,
            noWarn: true,
            predicate: () => settings.store.bothStyles,
            replacement: {
                match: /"(?:username|dot)"===\i(?!\.\i)/g,
                replace: "true",
            },
        },

        {
            find: "#{intl::ADD_ROLE_A11Y_LABEL}",
            all: true,
            predicate: () => settings.store.copyRoleColorInProfilePopout && !settings.store.bothStyles,
            noWarn: true,
            replacement: {
                match: /"dot"===\i/,
                replace: "true"
            }
        },
        {
            find: ".roleVerifiedIcon",
            all: true,
            predicate: () => settings.store.copyRoleColorInProfilePopout && !settings.store.bothStyles,
            noWarn: true,
            replacement: {
                match: /"dot"===\i/,
                replace: "true"
            }
        }
    ],

    copyToClipBoard(color: string) {
        copyWithToast(color);
    },
});
