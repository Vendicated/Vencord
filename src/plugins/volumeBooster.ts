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

import { makeRange } from "@components/PluginSettings/components/SettingSliderComponent";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "VolumeBooster",
    authors: [Devs.Nuckyz],
    description: "Allows you to set the user and stream volume above the default maximum.",

    patches: [
        // Change the max volume for sliders to allow for values above 200
        ...[
            ".Messages.USER_VOLUME",
            "currentVolume:"
        ].map(find => ({
            find,
            replacement: {
                match: /maxValue:(?<defaultMaxVolumePredicate>\i\.\i)\?(?<higherMaxVolume>\d+?):(?<minorMaxVolume>\d+?),/,
                replace: ""
                    + "maxValue:$<defaultMaxVolumePredicate>"
                    + "?$<higherMaxVolume>*Vencord.Settings.plugins.VolumeBooster.multiplier"
                    + ":$<minorMaxVolume>*Vencord.Settings.plugins.VolumeBooster.multiplier,"
            }
        })),
        // Prevent Audio Context Settings sync from sending trying to sync with values above 200, changing them to 200 before we send to Discord
        {
            find: "AudioContextSettingsMigrated",
            replacement: [
                {
                    match: /(?<restOfFunction>updateAsync\("audioContextSettings".{1,50})(?<volumeChangeExpression>return (?<volumeOptions>\i)\.volume=(?<newVolume>\i))/,
                    replace: "$<restOfFunction>if($<newVolume>>200)return $<volumeOptions>.volume=200;$<volumeChangeExpression>"
                },
                {
                    match: /(?<restOfFunction>Object\.entries\(\i\.localMutes\).+?)volume:(?<volumeExpression>.+?),/,
                    replace: "$<restOfFunction>volume:$<volumeExpression>>200?200:$<volumeExpression>,"
                },
                {
                    match: /(?<restOfFunction>Object\.entries\(\i\.localVolumes\).+?)volume:(?<volumeExpression>.+?)}\)/,
                    replace: "$<restOfFunction>volume:$<volumeExpression>>200?200:$<volumeExpression>})"
                }
            ]
        },
        // Prevent the MediaEngineStore from overwriting our LocalVolumes above 200 with the ones the Discord Audio Context Settings sync sends
        {
            find: '.displayName="MediaEngineStore"',
            replacement: [
                {
                    match: /(?<restOfFunction>\.settings\.audioContextSettings.+?)(?<localVolume>\i\[\i\])=(?<syncVolume>\i\.volume)(?<secondRestOfFunction>.+?)setLocalVolume\((?<id>.+?),.+?\)/,
                    replace: ""
                        + "$<restOfFunction>"
                        + "($<localVolume>>200?undefined:$<localVolume>=$<syncVolume>)"
                        + "$<secondRestOfFunction>"
                        + "setLocalVolume($<id>,$<localVolume>)"
                }
            ]
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
