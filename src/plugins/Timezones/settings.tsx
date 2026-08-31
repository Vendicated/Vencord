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
import { OptionType } from "@utils/types";

export enum CustomTimezonePreference {
    Never,
    Secondary,
    Always
}

export default definePluginSettings({
    preference: {
        type: OptionType.SELECT,
        description: "When to use custom timezones over TimezoneDB.",
        options: [
            {
                label: "Never use custom timezones.",
                value: CustomTimezonePreference.Never,
            },
            {
                label: "Prefer custom timezones over TimezoneDB",
                value: CustomTimezonePreference.Secondary,
                default: true,
            },
            {
                label: "Always use custom timezones.",
                value: CustomTimezonePreference.Always,
            },
        ],
        default: CustomTimezonePreference.Secondary,
    },
    showTimezonesInChat: {
        type: OptionType.BOOLEAN,
        description: "Show timezones in chat",
        default: true,
    },
    showTimezonesInProfile: {
        type: OptionType.BOOLEAN,
        description: "Show timezones in profile",
        default: true,
    },
});
