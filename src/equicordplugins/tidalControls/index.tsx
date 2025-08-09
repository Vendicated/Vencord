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

import { definePluginSettings, Settings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Lyrics as SpotifyLyrics } from "@equicordplugins/spotifyLyrics/components/lyrics";
import { Player as SpotifyPlayer } from "@plugins/spotifyControls/PlayerComponent";
import { Player as YTMPlayer } from "@equicordplugins/youtubeMusicControls/PlayerComponent";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, MaskedLink } from "@webpack/common";

import hoverOnlyStyle from "./hoverOnly.css?managed";
import { TidalPlayer } from "./TidalPlayer";

function toggleHoverControls(value: boolean) {
    (value ? enableStyle : disableStyle)(hoverOnlyStyle);
}


function InstallInstructions() {
    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">How to install</Forms.FormTitle>
            <Forms.FormText>
                Install <MaskedLink href="https://github.com/Inrixia/TidaLuna#installation">TidaLuna</MaskedLink> from here, then go to TidalLuna settings &rarr; Plugin stores &rarr; Install <code>@vmohammad/api</code>
            </Forms.FormText>
        </Forms.FormSection>
    );
}

const settings = definePluginSettings({
    installYtmWithWebsocket: {
        type: OptionType.COMPONENT,
        component: () => <InstallInstructions />
    },
    hoverControls: {
        description: "Show controls on hover",
        type: OptionType.BOOLEAN,
        default: false,
        onChange: v => toggleHoverControls(v)
    },
    // SOON™️™️™️
    // lyricsProvider: {
    //     description: "Which provider should be used for lyrics",
    //     type: OptionType.SELECT,
    //     options: [
    //         { label: "Tidal", value: "tidal", default: true },
    //         { label: "vMohammad's Synced API", value: "synced" }
    //     ]
    // }
});

export default definePlugin({
    name: "TidalControls",
    description: "Adds a TIDAL player above the account panel",
    authors: [EquicordDevs.vmohammad],
    settings,
    patches: [
        {
            find: "this.isCopiedStreakGodlike",
            replacement: [
                {
                    match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,hidePrivateData:)/,
                    replace: "$self.PanelWrapper,{VencordOriginal:$1,",
                    predicate: () => !Settings.plugins.SpotifyControls.enabled,
                    noWarn: true,
                },
                {
                    match: /Vencord\.Plugins\.plugins\["SpotifyLyrics"\]\.FakePanelWrapper/,
                    replace: "$self.PanelWrapper",
                    predicate: () => Settings.plugins.SpotifyLyrics.enabled,
                    noWarn: true,
                },
                {
                    match: /Vencord\.Plugins\.plugins\["SpotifyControls"\]\.PanelWrapper/,
                    replace: "$self.PanelWrapper",
                    predicate: () => Settings.plugins.SpotifyControls.enabled && !Settings.plugins.SpotifyLyrics.enabled,
                    noWarn: true,
                },
                {
                    match: /Vencord\.Plugins\.plugins\["YouTubeMusicControls"\]\.FakePanelWrapper/,
                    replace: "$self.PanelWrapper",
                    predicate: () => Settings.plugins.YouTubeMusicControls.enabled,
                    noWarn: true,
                },
            ],
        },
    ],

    start: () => toggleHoverControls(Settings.plugins.YouTubeMusicControls.hoverControls),

    PanelWrapper({ VencordOriginal, ...props }) {
        const showYTMPlayer = Settings.plugins.YouTubeMusicControls.enabled;
        const showSpotifyControls = Settings.plugins.SpotifyControls.enabled;
        const showSpotifyLyrics = Settings.plugins.SpotifyLyrics.enabled;
        const LyricsPosition = showSpotifyLyrics ? Settings.plugins.SpotifyLyrics.LyricsPosition : null;
        return (
            <>
                <ErrorBoundary
                    fallback={() => (
                        <div className="vc-ytmusic-fallback">
                            <p>Failed to render YouTube Music Modal :(</p>
                            <p>Check the console for errors</p>
                        </div>
                    )}
                >
                    <TidalPlayer />
                    
                    {showYTMPlayer && <YTMPlayer /> }
                    {showSpotifyLyrics && LyricsPosition === "above" && <SpotifyLyrics />}
                    {showSpotifyControls && <SpotifyPlayer />}
                    {showSpotifyLyrics && LyricsPosition === "below" && <SpotifyLyrics />}
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    }
});
