/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { useAuthorizationStore } from "./lib/stores/AuthorizationStore";
import { useSongStore } from "./lib/stores/SongStore";
import settings from "./settings";
import ProfileSongs from "./ui/songs/ProfileSongs";
import WidgetSongs from "./ui/songs/WidgetSongs";

export default definePlugin({
    name: "SongSpotlight",
    description: "Show off songs on your profile",
    tags: ["Appearance", "Media"],
    authors: [Devs.nexpid],
    settings,
    patches: [
        // Own profile popout
        {
            find: '"UserProfileAccountPopout"',
            replacement: {
                match: /user:(\i),widgets:.{0,100}}\),/,
                replace: "$&$self.renderProfileSongs({user:$1}),",
            },
        },
        // Message and member list popout (lazy loaded)
        {
            find: '"UserProfilePopout");',
            replacement: {
                match: /user:(\i),widgets:.{0,100}?\}\),/,
                replace: "$&$self.renderProfileSongs({user:$1}),",
            },
        },
        // DM sidebar
        {
            find: ".SIDEBAR,disableToolbar:",
            replacement: {
                match: /user:(\i),widgets:.{0,100}?\}\),(?=.{0,300}?#{intl::USER_PROFILE_WISHLIST})/,
                replace: "$&$self.renderProfileSongs({user:$1,isSideBar:true}),"
            }
        },
        // Full profile modal sections (lazy loaded)
        {
            find: ".MUTUAL_GUILDS})),",
            replacement: {
                match: /(\i).push\({text.{0,50}.ACTIVITY\}\);/,
                replace: '$&$1.push({text:"Song Spotlight",section:"SONG_SPOTLIGHT"});',
            },
        },
        {
            find: ".hasUnsavedChanges()&&",
            replacement: {
                match: /({user:(\i),.{0,80}return (\i===))/,
                replace: '$1"SONG_SPOTLIGHT"?$self.renderWidgetSongs({user:$2}):$3',
            },
        },
    ],

    flux: {
        CONNECTION_OPEN: () => {
            useSongStore.getState().$refresh();
        },
    },
    start() {
        useSongStore.getState().$refresh();
        useAuthorizationStore.persist.rehydrate();
    },

    renderProfileSongs: ErrorBoundary.wrap(ProfileSongs, { noop: true }),
    renderWidgetSongs: ErrorBoundary.wrap(WidgetSongs, { noop: true }),
});
