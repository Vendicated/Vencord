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

import { ShowMode } from "./constants";

export const settings = definePluginSettings({
    hideUnreads: {
        description: "Hide Unreads",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    showMode: {
        description: "The mode used to display hidden channels.",
        type: OptionType.SELECT,
        options: [
            { label: "Plain style with Lock Icon instead", value: ShowMode.LockIcon, default: true },
            { label: "Muted style with hidden eye icon on the right", value: ShowMode.HiddenIconWithMutedStyle },
        ],
        restartNeeded: true
    },
    defaultAllowedUsersAndRolesDropdownState: {
        description: "Whether the allowed users and roles dropdown on hidden channels should be open by default",
        type: OptionType.BOOLEAN,
        default: true
    }
});
