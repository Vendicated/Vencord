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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { settings } from "./settings";
import type { Def } from "./types";

export default definePlugin({
    name: "SoundChanger",
    description: "Change any discord sound you want!",
    authors: [Devs.Arjix],
    settings,

    // Export of the object that contains all of the sounds and their IDs
    soundModules: {},

    patches: [{
        find: "./call_calling.mp3",
        replacement: {
            match: /(var (\i)=\{.*?\};)(function \i\((\i)\){)(.*?return \i\(\i\)})/,
            replace: (m, soundsDef, soundsVar, r, e, o) => (
                soundsDef +
                `$self.soundModules=${soundsVar};` +
                r + "if($self.settings.store.enabled&&" +
                `(__sound__=$self.settings.store.sounds?.find(sound=>sound.fileName===${e})))` +
                "{return __sound__.link;}" + o)
        }
    }],
} as Def);
