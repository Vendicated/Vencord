/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, useEffect, useState, useStateFromStores, PresenceStore, AuthenticationStore, SpotifyStore } from "@webpack/common";
import ErrorBoundary from "@components/ErrorBoundary";
import { formatDuration } from "@utils/text";

function SpotifyDisplayer() {
    const localActivity = useStateFromStores([PresenceStore, SpotifyStore], () => {
        const userId = AuthenticationStore.getId();
        if (!userId) return null;

        const localActivity = SpotifyStore.getActivity();
        if (localActivity) return localActivity;

        return PresenceStore.getActivities(userId).find(a => a.name === "Spotify");
    });

    const start = localActivity?.timestamps?.start;
    const end = localActivity?.timestamps?.end;

    const duration = (start && end) ? (end - start) : 0;
    const [position, setPosition] = useState(0);

    useEffect(() => {
        if (!start || duration <= 0) return;

        const updatePosition = () => {
            const current = Date.now() - start;
            setPosition(Math.max(0, Math.min(current, duration)));
        };

        updatePosition();
        const interval = setInterval(updatePosition, 1000);
        return () => clearInterval(interval);
    }, [start, duration]);

    if (!localActivity || !start || !end || duration <= 0) return null;

    const percent = (position / duration) * 100;

    const largeImage = localActivity.assets?.large_image;
    const coverUrl = largeImage ? `https://i.scdn.co/image/${largeImage.startsWith("spotify:") ? largeImage.slice(8) : largeImage}` : "";

    const title = localActivity.details || "Unknown Track";
    const artist = localActivity.state || "Unknown Artist";

    return (
        <div id="vc-spotify-displayer">
            <div className="vc-spotify-displayer-content">
                {coverUrl && (<img className="vc-spotify-displayer-cover" src={coverUrl} alt="Album Cover" />)}
                <div className="vc-spotify-displayer-info">
                    <div className="vc-spotify-displayer-title" title={title}> {title} </div>
                    <div className="vc-spotify-displayer-artist" title={artist}> {artist} </div>
                </div>
            </div>
            <div className="vc-spotify-displayer-progress">
                <span className="vc-spotify-displayer-time"> {formatDuration(position)} </span>
                <div className="vc-spotify-displayer-bar-bg">
                    <div className="vc-spotify-displayer-bar-fill" style={{ width: `${percent}%` }} />
                </div>
                <span className="vc-spotify-displayer-time"> {formatDuration(duration)} </span>
            </div>
        </div>
    );
}

export default definePlugin({
    name: "spotifyDisplayer",
    description: "Display spotify song information above the username",
    authors: [Devs.TinTin],
    patches: [
        {
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            replacement: { match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,occluded:)/, replace: "$self.PanelWrapper,{VencordOriginal:$1," }
        }
    ],

    PanelWrapper({ VencordOriginal, ...props }: any) {
        return (
            <>
                <ErrorBoundary fallback={() => (<div className="vc-spotify-displayer-fallback"><p>Failed to render Spotify Displayer :(</p></div>)}>
                    <SpotifyDisplayer />
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    }
});
