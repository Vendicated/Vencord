/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 pluckerpilple
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

import { types } from "../../philsPluginLibrary";

export const PluginInfo = {
    PLUGIN_NAME: "BetterMicrophone",
    DESCRIPTION: "This plugin allows you to further customize your microphone.",
    AUTHOR: {
        name: "pluckerpilple",
        id: 375402345971974147n,
        github: "https://github.com/Mujhid1552"
    },
    CONTRIBUTORS: {}
} as const satisfies types.PluginInfo;