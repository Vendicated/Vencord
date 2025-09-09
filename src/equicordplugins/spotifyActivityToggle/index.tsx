/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Constants, React, RestAPI, useEffect, useState } from "@webpack/common";

const Button = findComponentByCodeLazy(".NONE,disabled:", ".PANEL_BUTTON");

function makeSpotifyIcon(enabled: boolean) {
    const redLinePath = "M48.54 4.54a2.2 2.2 0 0 0-3.08-3.08l-44 44a2.2 2.2 0 1 0 3.08 3.08Z";
    const maskBlackPath = "M50.376 8.248 41.752-.376-.376 41.752 8.248 50.376Z";

    return (
        <svg width="20" height="20" viewBox="0 0 50 50">
            <path
                fill={!enabled ? "var(--status-danger)" : "currentColor"}
                mask={!enabled ? "url(#spotifyActivityMask)" : void 0}
                d="M25.009,1.982C12.322,1.982,2,12.304,2,24.991S12.322,48,25.009,48s23.009-10.321,23.009-23.009S37.696,1.982,25.009,1.982z M34.748,35.333c-0.289,0.434-0.765,0.668-1.25,0.668c-0.286,0-0.575-0.081-0.831-0.252C30.194,34.1,26,33,22.5,33.001 c-3.714,0.002-6.498,0.914-6.526,0.923c-0.784,0.266-1.635-0.162-1.897-0.948s0.163-1.636,0.949-1.897 c0.132-0.044,3.279-1.075,7.474-1.077C26,30,30.868,30.944,34.332,33.253C35.022,33.713,35.208,34.644,34.748,35.333z M37.74,29.193 c-0.325,0.522-0.886,0.809-1.459,0.809c-0.31,0-0.624-0.083-0.906-0.26c-4.484-2.794-9.092-3.385-13.062-3.35 c-4.482,0.04-8.066,0.895-8.127,0.913c-0.907,0.258-1.861-0.272-2.12-1.183c-0.259-0.913,0.272-1.862,1.184-2.12 c0.277-0.079,3.854-0.959,8.751-1c4.465-0.037,10.029,0.61,15.191,3.826C37.995,27.328,38.242,28.388,37.74,29.193z M40.725,22.013 C40.352,22.647,39.684,23,38.998,23c-0.344,0-0.692-0.089-1.011-0.275c-5.226-3.068-11.58-3.719-15.99-3.725 c-0.021,0-0.042,0-0.063,0c-5.333,0-9.44,0.938-9.481,0.948c-1.078,0.247-2.151-0.419-2.401-1.495 c-0.25-1.075,0.417-2.149,1.492-2.4C11.729,16.01,16.117,15,21.934,15c0.023,0,0.046,0,0.069,0 c4.905,0.007,12.011,0.753,18.01,4.275C40.965,19.835,41.284,21.061,40.725,22.013z"
            />
            {!enabled && <>
                <path fill="var(--status-danger)" d={redLinePath} />
                <mask id="spotifyActivityMask">
                    <rect fill="white" x="0" y="0" width="50" height="50" />
                    <path fill="black" d={maskBlackPath} />
                </mask>
            </>}
        </svg>
    );
}

function SpotifyActivityToggleButton() {
    const [loading, setLoading] = useState(true);
    const [id, setId] = useState<string | null>(null);
    const [showActivity, setShowActivity] = useState<boolean | null>(null);

    useEffect(() => {
        (async () => {
            const { body } = await RestAPI.get({
                url: Constants.Endpoints.CONNECTIONS,
            });
            if (!body) return;

            const spotifyConn = body.find(c => c.type === "spotify");
            if (spotifyConn) {
                setId(spotifyConn.id);
                setShowActivity(spotifyConn.show_activity);
            }
            setLoading(false);
        })();
    }, []);

    if (loading || !id || showActivity === null) return null;

    return (
        <Button
            tooltipText={showActivity ? "Turn off Spotify activity" : "Turn on Spotify activity"}
            icon={makeSpotifyIcon(showActivity)}
            role="switch"
            aria-checked={showActivity}
            redGlow={!showActivity}
            onClick={async () => {
                const newValue = !showActivity;
                setShowActivity(newValue);
                await RestAPI.patch({
                    url: Constants.Endpoints.CONNECTION("spotify", id),
                    body: {
                        show_activity: newValue,
                    },
                });
            }}
        />
    );
}

export default definePlugin({
    name: "SpotifyActivityToggle",
    description: "Adds a toggle button for Spotify activity visibility.",
    authors: [Devs.thororen],
    patches: [
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /className:\i\.buttons,.{0,50}children:\[/,
                replace: "$&$self.SpotifyActivityToggleButton(),"
            }
        }
    ],
    SpotifyActivityToggleButton: ErrorBoundary.wrap(SpotifyActivityToggleButton, { noop: true }),
});
