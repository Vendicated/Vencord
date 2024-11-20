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
import { OptionType } from "@utils/types";

export const enum PronounsFormat {
    Lowercase = "LOWERCASE",
    Capitalized = "CAPITALIZED"
}

export const settings = definePluginSettings({
    pronounsFormat: {
        type: OptionType.SELECT,
        description: "The format for pronouns to appear in chat",
        options: [
            {
                label: "Lowercase",
                value: PronounsFormat.Lowercase,
                default: true
            },
            {
                label: "Capitalized",
                value: PronounsFormat.Capitalized
            }
        ]
    },
    showSelf: {
        type: OptionType.BOOLEAN,
        description: "Enable or disable showing pronouns for yourself",
        default: true
    }
});
