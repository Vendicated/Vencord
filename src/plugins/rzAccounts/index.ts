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
        description: "لو حطيت 0 يصير لانهائي",
        default: 0,
        type: OptionType.NUMBER,
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "اضافات",
    description: "يخليك تضيف لين تطفش بس خذها مني الافضل انك تحط 0",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    settings,
    patches: [
        {
            find: "multiaccount_cta_tooltip_seen",
            replacement: {
                match: /(let \i=)\d+(,\i="switch-accounts-modal")/,
                replace: "$1$self.getMaxAccounts()$2",
            },
        },
    ],
    getMaxAccounts() { return settings.store.maxAccounts === 0 ? Infinity : settings.store.maxAccounts; },
});
