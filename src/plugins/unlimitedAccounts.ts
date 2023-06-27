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
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    maxAccounts: {
        description: "Number of accounts that can be added or 0 for infinite",
        default: Number.POSITIVE_INFINITY,
        type: OptionType.NUMBER,
        restartNeeded: true,
    }
});

export default definePlugin({
    name: "UnlimitedAccounts",
    description: "Increases the amount of accounts you can add.",
    authors: [Devs.Balaclava],
    settings,
    patches: [
        {
            find: "switch-accounts-modal",
            replacement: {
                match: /var (.{1,2})=\d+,(.{1,2})="switch-accounts-modal"/,
                replace: 'var $1=Vencord.Settings.plugins.UnlimitedAccounts.maxAccounts===0?Infinity:Vencord.Settings.plugins.UnlimitedAccounts.maxAccounts,$2="switch-accounts-modal"',
            },
        },
    ],
});
