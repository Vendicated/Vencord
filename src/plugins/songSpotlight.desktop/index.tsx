/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { useAuthorizationStore } from "./lib/store/AuthorizationStore";
import { useSongStore } from "./lib/store/SongStore";
import { clearCache } from "./service";
import { settings } from "./settings";
import { ProfileSongs } from "./ui/songs/ProfileSongs";
import { WidgetSongs } from "./ui/songs/WidgetSongs";

export default definePlugin({
    name: "SongSpotlight",
    description: "Show off songs on your profile",
    authors: [Devs.nexpid],
    settings,
    patches: [
        // Personal profile popout
        {
            find: ".WIDGETS_USER_PROFILE_ACCOUNT_POPOUT_NEW_BADGE]",
            replacement: {
                match: /user:(\i),bio:.{0,60}}\)/,
                replace: "$&,$self.renderProfileSongs({userId:$1.id})",
            },
        },
        // Message user popout
        {
            find: ".isProvisional?(",
            replacement: {
                match: /user:(\i),bio:.{0,60}}\)/,
                replace: "$&,$self.renderProfileSongs({userId:$1.id})",
            },
        },
        // DM sidebar profile
        {
            find: ".SIDEBAR}),nicknameIcons:",
            replacement: {
                match: /{userId:(\i)\.id}\)}\)]}\)/,
                replace: "$&,$self.renderProfileSongs({userId:$1.id})",
            },
        },
        // Full profile modal sections (lazy loaded)
        {
            find: ".MUTUAL_GUILDS})),",
            replacement: {
                match: /(\i).push\({text.{0,50}}\);/,
                replace: "$&$1.push({text:\"Song Spotlight\",section:\"SONG_SPOTLIGHT\"});",
            },
        },
        {
            find: ".hasUnsavedChanges()&&",
            replacement: {
                match: /({user:(\i),.{0,80}return (\i===))/,
                replace: "$1\"SONG_SPOTLIGHT\"?$self.renderWidgetSongs({user:$2}):$3",
            },
        },
    ],

    flux: {
        CONNECTION_OPEN: () => {
            useSongStore.getState().$refresh();
        },
    },
    start() {
        // the cache lives in native.ts so it persists between reloads and
        // only gets cleared on full restart. we don't want that since
        // audio preview URLs expire very fast, so we just clear it on
        // // plugin restart instead
        clearCache();

        useSongStore.getState().$refresh();
        useAuthorizationStore.persist.rehydrate();
    },

    renderProfileSongs: ErrorBoundary.wrap(ProfileSongs, { noop: true }),
    renderWidgetSongs: ErrorBoundary.wrap(WidgetSongs, { noop: true }),
});
