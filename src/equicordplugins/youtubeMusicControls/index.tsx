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
import { Lyrics } from "@equicordplugins/spotifyLyrics/components/lyrics";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, MaskedLink } from "@webpack/common";
import { Player as SpotifyPlayer } from "plugins/spotifyControls/PlayerComponent";

import hoverOnlyStyle from "./hoverOnly.css?managed";
import { Player } from "./PlayerComponent";

function toggleHoverControls(value: boolean) {
    (value ? enableStyle : disableStyle)(hoverOnlyStyle);
}

function isUrlValid(value: string) {
    try {
        const url = new URL(value);
        return url.protocol !== "" && url.host !== "";
    } catch (e) {
        return false;
    }
}

/*
function InstallInstructions() {
    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">How to install</Forms.FormTitle>
            <Forms.FormText>Instructions on how to install YouTube music with websocket plugin</Forms.FormText>

            <Forms.FormText>

                <span>Software needed: <MaskedLink href="https://git-scm.com/downloads">git</MaskedLink>,<MaskedLink href="https://nodejs.org/en/download">node.js</MaskedLink> &gt;= 22.12.0,<MaskedLink href="https://pnpm.io/installation">pnpm</MaskedLink></span>

                <code className="hljs" style={{ userSelect: "text", cursor: "text" }}>
                    git clone https://github.com/th-ch/youtube-music<br />
                    cd .\youtube-music\<br />
                    git remote add johannes https://github.com/Johannes7k75/youtube-music.git<br />
                    git fetch johannes<br />
                    git merge johannes/feat/api-websocket<br />
                    pnpm install --frozen-lockfile<br />
                    pnpm dist:win<br />
                </code>
            </Forms.FormText>
        </Forms.FormSection>
    );
}
*/

function InstallInstructions() {
    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">How to install</Forms.FormTitle>
            <Forms.FormText>Instructions on how to install YouTube music with websocket plugin</Forms.FormText>

            <Forms.FormText>

                <span>Software needed: <MaskedLink href="https://git-scm.com/downloads">git</MaskedLink>,<MaskedLink href="https://nodejs.org/en/download">node.js</MaskedLink> &gt;= 22.12.0,<MaskedLink href="https://pnpm.io/installation">pnpm</MaskedLink></span>

                <code className="hljs" style={{ userSelect: "text", cursor: "text" }}>
                    git clone https://github.com/thororen1234/youtube-music.git<br />
                    cd .\youtube-music\<br />
                    pnpm install --frozen-lockfile<br />
                    pnpm dist:win<br />
                </code>
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
    websocketUrl: {
        description: "The websocket url",
        type: OptionType.STRING,
        placeholder: "ws://localhost:26539",
        default: "ws://localhost:26539",
        isValid: isUrlValid,
    }
});

export default definePlugin({
    name: "YouTubeMusicControls",
    description: "Adds a YouTube Music player above the account panel, requires `https://github.com/th-ch/youtube-music` with an custom websocket plugin. See Readme of ths Plugin for instructions",
    authors: [EquicordDevs.Johannes7k75],
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
                }
            ],
        },
    ],

    start: () => toggleHoverControls(Settings.plugins.YouTubeMusicControls.hoverControls),

    PanelWrapper({ VencordOriginal, ...props }) {
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
                    <Player />

                    {showSpotifyLyrics && LyricsPosition === "above" && <Lyrics />}
                    {showSpotifyControls && <SpotifyPlayer />}
                    {showSpotifyLyrics && LyricsPosition === "below" && <Lyrics />}
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    }
});
