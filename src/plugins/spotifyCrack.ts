/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    noSpotifyAutoPause: {
        description: "Disable Spotify auto-pause",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    keepSpotifyActivityOnIdle: {
        description: "Keep Spotify activity playing when idling",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "SpotifyCrack",
    description: "Free listen along, no auto-pausing in voice chat, and allows activity to continue playing when idling",
    authors: [Devs.Cyn, Devs.Nuckyz],
    settings,

    patches: [
        {

            find: 'dispatch({type:"SPOTIFY_PROFILE_UPDATE"',
            replacement: {
                match: /SPOTIFY_PROFILE_UPDATE.+?isPremium:(?="premium"===(\i)\.body\.product)/,
                replace: (m, req) => `${m}(${req}.body.product="premium")&&`
            },
        },
        {
            find: '.displayName="SpotifyStore"',
            replacement: [
                {
                    predicate: () => settings.store.noSpotifyAutoPause,
                    match: /(?<=function \i\(\){)(?=.{0,200}SPOTIFY_AUTO_PAUSED\))/,
                    replace: "return;"
                },
                {
                    predicate: () => settings.store.keepSpotifyActivityOnIdle,
                    match: /(?<=shouldShowActivity=function\(\){.{0,50})&&!\i\.\i\.isIdle\(\)/,
                    replace: ""
                }
            ]
        }
    ]
});
