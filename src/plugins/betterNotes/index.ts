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

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "BetterNotesBox",
    description: "Hide notes or disable spellcheck (Configure in settings!!)",
    authors: [Devs.Ven],

    patches: [
        {
            find: "hideNote:",
            all: true,
            predicate: () => Vencord.Settings.plugins.BetterNotesBox.hide,
            replacement: {
                match: /hideNote:.+?(?=[,}])/g,
                replace: "hideNote:true",
            }
        }, {
            find: "Messages.NOTE_PLACEHOLDER",
            replacement: {
                match: /\.NOTE_PLACEHOLDER,/,
                replace: "$&spellCheck:!Vencord.Settings.plugins.BetterNotesBox.noSpellCheck,"
            }
        }
    ],

    options: {
        hide: {
            type: OptionType.BOOLEAN,
            description: "Hide notes",
            default: false,
            restartNeeded: true
        },
        noSpellCheck: {
            type: OptionType.BOOLEAN,
            description: "Disable spellcheck in notes",
            disabled: () => Settings.plugins.BetterNotesBox.hide,
            default: false
        }
    }
});
