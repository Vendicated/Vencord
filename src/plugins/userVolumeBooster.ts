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

import { makeRange } from "../components/PluginSettings/components/SettingSliderComponent";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";


export default definePlugin({
    name: "UserVolumeBooster",
    authors: [Devs.Nuckyz],
    description: "Allows you to set the user volume above the default maximum.",

    patches: [
        {
            find: ".Messages.USER_VOLUME",
            replacement: {
                match: /(:(.{1,2})\?.{1,2}\..{1,2}\.Messages\.STREAM_VOLUME.+?)maxValue:(.{1,2}\..{1,2})\?(\d+?):(\d+?),/,
                replace: (_, restOfFunction, isStream, defaultMaxVolumePredicate, higherMaxVolume, minorMaxVolume) => ""
                    + restOfFunction
                    + `maxValue:${defaultMaxVolumePredicate}`
                    + `?(${isStream}?${higherMaxVolume}:${higherMaxVolume}*Vencord.Settings.plugins.UserVolumeBooster.multiplier)`
                    + `:(${isStream}?${minorMaxVolume}:${minorMaxVolume}*Vencord.Settings.plugins.UserVolumeBooster.multiplier),`
            }
        }
    ],

    options: {
        multiplier: {
            description: "Volume Multiplier",
            type: OptionType.SLIDER,
            markers: makeRange(1, 5, 1),
            default: 2,
            stickToMarkers: true,
        }
    }
});
