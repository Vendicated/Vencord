/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated, Samu and contributors
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

import { migratePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import choice from "./commands/choice";
import misc from "./commands/misc";
import system from "./commands/system";
import text from "./commands/text";
import time from "./commands/time";

migratePluginSettings("MoreCommands", "CuteAnimeBoys", "CuteNekos", "CutePats", "Slap");
export default definePlugin({
    name: "MoreCommands",
    description: "Adds various fun and useful commands",
    authors: [Devs.Arjix, Devs.amy, Devs.Samu, EquicordDevs.zyqunix, EquicordDevs.ShadyGoat, Devs.thororen, Devs.Korbo],
    commands: [
        ...choice,
        ...system,
        ...text,
        ...time,
        ...misc,
    ]
});
