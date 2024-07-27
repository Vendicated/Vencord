/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./youtubeMusicStyles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { Player } from "./PlayerComponents";

export default definePlugin({
    name: "YoutubeMusicControls",
    description: "Adds a YouTube Music player above the account panel",
    authors: [Devs.Johannes7k75],

    patches: [
        {
            find: '"AccountConnected"',
            replacement: {
                // react.jsx)(AccountPanel, { ..., showTaglessAccountPanel: blah })
                match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,hidePrivateData:)/,
                // react.jsx(WrapperComponent, { VencordOriginal: AccountPanel, ...
                replace: "$self.PanelWrapper,{VencordOriginal:$1,"
            }
        }
    ],

    PanelWrapper({ VencordOriginal, ...props }) {
        console.log("Start YoutubeMusicControls");

        return (<>
            <ErrorBoundary fallback={() => (
                <div className="vc-youtube-music-fallback">
                    <p>Failed to render Youtube Music Modal :(</p>
                    <p >Check the console for errors</p>
                </div>
            )}>

                <Player />
            </ErrorBoundary>

            <VencordOriginal {...props} />
        </>);
    }
});
