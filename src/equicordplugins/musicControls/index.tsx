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

import "./styles.css";

import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import { settings, toggleHoverControls } from "./settings";
import { migrateOldLyrics } from "./spotify/lyrics/api";
import { SpotifyLyrics } from "./spotify/lyrics/components/lyrics";
import { SpotifyPlayer } from "./spotify/PlayerComponent";
import { TidalLyrics } from "./tidal/lyrics/components/lyrics";
import { TidalPlayer } from "./tidal/TidalPlayer";

export default definePlugin({
    name: "MusicControls",
    description: "Music Controls and Lyrics for multiple services ",
    authors: [Devs.Ven, Devs.afn, Devs.KraXen72, Devs.Av32000, Devs.nin0dev, EquicordDevs.thororen, EquicordDevs.vmohammad, Devs.Joona],
    settings,
    patches: [
        {
            find: "this.isCopiedStreakGodlike",
            replacement: {
                // react.jsx)(AccountPanel, { ..., showTaglessAccountPanel: blah })
                match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,hidePrivateData:)/,
                // react.jsx(WrapperComponent, { VencordOriginal: AccountPanel, ...
                replace: "$self.PanelWrapper,{VencordOriginal:$1,"
            },
        },
        {
            find: ".PLAYER_DEVICES",
            replacement: [{
                // Adds POST and a Marker to the SpotifyAPI (so we can easily find it)
                match: /get:(\i)\.bind\(null,(\i\.\i)\.get\)/,
                replace: "post:$1.bind(null,$2.post),vcSpotifyMarker:1,$&"
            },
            {
                // Spotify Connect API returns status 202 instead of 204 when skipping tracks.
                // Discord rejects 202 which causes the request to send twice. This patch prevents this.
                match: /202===\i\.status/,
                replace: "false",
            }]
        },
        {
            find: 'repeat:"off"!==',
            replacement: [
                {
                    // Discord doesn't give you shuffle state and the repeat kind, only a boolean
                    match: /repeat:"off"!==(\i),/,
                    replace: "shuffle:arguments[2]?.shuffle_state??false,actual_repeat:$1,$&"
                },
                {
                    match: /(?<=artists.filter\(\i=>).{0,10}\i\.id\)&&/,
                    replace: ""
                }
            ]
        },
    ],


    PanelWrapper({ VencordOriginal, ...props }) {
        const { showTidalControls, showTidalLyrics, showSpotifyLyrics, showSpotifyControls, LyricsPosition } = settings.store;
        return (
            <>
                <ErrorBoundary
                    fallback={() => (
                        <div className="vc-tidal-fallback">
                            <p>Failed to render Modal :(</p>
                            <p>Check the console for errors</p>
                        </div>
                    )}
                >
                    {showTidalLyrics && LyricsPosition === "above" && <TidalLyrics />}
                    {showTidalControls && <TidalPlayer />}
                    {showTidalLyrics && LyricsPosition === "below" && <TidalLyrics />}
                    {showSpotifyLyrics && LyricsPosition === "above" && <SpotifyLyrics />}
                    {showSpotifyControls && <SpotifyPlayer />}
                    {showSpotifyLyrics && LyricsPosition === "below" && <SpotifyLyrics />}
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    },

    async start() {
        await migrateOldLyrics();
        toggleHoverControls(Settings.plugins.MusicControls.hoverControls);
    },
});
