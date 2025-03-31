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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";


const settings = definePluginSettings({
    clipAllStreams: {
        description: "Allows clipping on all streams regardless of the streamer's settings.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    clipAllParticipants: {
        description: "Allows recording of all voice call participants regardless of their settings.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    moreClipDurations: {
        description: "Adds more clip durations.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "BetterClips",
    authors: [
        Devs.Loukious
    ],
    settings,
    patches: [
        {
            predicate: () => settings.store.clipAllStreams,
            find: "}isViewerClippingAllowedForUser",
            replacement: {
                match: /isViewerClippingAllowedForUser\(\w+\){/,
                replace: "$&return true;"
            }
        },
        {
            predicate: () => settings.store.clipAllParticipants,
            find: "}isVoiceRecordingAllowedForUser",
            replacement: {
                match: /isVoiceRecordingAllowedForUser\(\w+\){/,
                replace: "$&return true;"
            }
        },
        {
            predicate: () => settings.store.moreClipDurations,
            find: "MINUTES_2=",
            replacement: {
                match: /((\i)\[(\i)\.MINUTES_2=2\*(\i)\.(\i)\.(\i)\.MINUTE\]="MINUTES_2",)/,
                replace: "$&$2[$3.MINUTES_3=3*$4.$5.$6.MINUTE]=\"MINUTES_3\",$2[$3.MINUTES_5=5*$4.$5.$6.MINUTE]=\"MINUTES_5\","
            }
        },
        {
            predicate: () => settings.store.moreClipDurations,
            find: "count:2})",
            replacement: {
                match: /\{value:(\i)\.(\i)\.MINUTES_2,label:(\i)\.(\i)\.formatToPlainString\((\i)\.(\i)\.(\w+),\{count:2\}\)\}/,
                replace: "$&,{value:$1.$2.MINUTES_3,label:$3.$4.formatToPlainString($5.$6.$7,{count:3})},{value:$1.$2.MINUTES_5,label:$3.$4.formatToPlainString($5.$6.$7,{count:5})}"
            }
        }
    ],
    description: "Enables extra clipping options for streams."
});
