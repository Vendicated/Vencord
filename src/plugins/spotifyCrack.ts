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

import { migratePluginSettings, Settings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

migratePluginSettings("SpotifyCrack", "Ify");
export default definePlugin({
    name: "SpotifyCrack",
    description: "Free listen along, no auto-pausing in voice chat, and allows activity to continue playing when idling",
    authors: [
        Devs.Cyn,
        Devs.Nuckyz
    ],

    patches: [{
        find: 'dispatch({type:"SPOTIFY_PROFILE_UPDATE"',
        replacement: [{
            match: /(function\((.{1,2})\){)(.{1,6}dispatch\({type:"SPOTIFY_PROFILE_UPDATE")/,
            replace: (_, functionStart, data, functionBody) => `${functionStart}${data}.body.product="premium";${functionBody}`
        }],
    }, {
        find: '.displayName="SpotifyStore"',
        predicate: () => Settings.plugins.SpotifyCrack.noSpotifyAutoPause,
        replacement: {
            match: /function (.{1,2})\(\).{0,200}SPOTIFY_AUTO_PAUSED\);.{0,}}}}/,
            replace: "function $1(){}"
        }
    }, {
        find: '.displayName="SpotifyStore"',
        predicate: () => Settings.plugins.SpotifyCrack.keepSpotifyActivityOnIdle,
        replacement: {
            match: /(shouldShowActivity=function\(\){.{1,50})&&!.{1,6}\.isIdle\(\)(.{0,}?})/,
            replace: (_, functionDeclarationAndExpression, restOfFunction) => `${functionDeclarationAndExpression}${restOfFunction}`
        }
    }],

    options: {
        noSpotifyAutoPause: {
            description: "Disable Spotify auto-pause",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true,
        },
        keepSpotifyActivityOnIdle: {
            description: "Keep Spotify activity playing when idling",
            type: OptionType.BOOLEAN,
            default: false,
            restartNeeded: true,
        }
    }
});
