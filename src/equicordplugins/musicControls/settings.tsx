/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { useAwaiter } from "@utils/react";
import { makeRange, OptionType } from "@utils/types";
import { Button, Forms, MaskedLink, showToast, Text, Toasts, useMemo } from "@webpack/common";

import hoverOnlyStyle from "./hoverOnly.css?managed";
import { clearLyricsCache, getLyricsCount } from "./spotify/lyrics/api";
import { useLyrics } from "./spotify/lyrics/components/util";
import { Provider } from "./spotify/lyrics/providers/types";

const sliderOptions = {
    markers: makeRange(-2500, 2500, 250),
    stickToMarkers: true,
};

export function toggleHoverControls(value: boolean) {
    (value ? enableStyle : disableStyle)(hoverOnlyStyle);
}

function Details() {
    const { lyricsInfo } = useLyrics();

    const [count, error, loading] = useAwaiter(
        useMemo(() => getLyricsCount, []),
        {
            onError: () => console.error("Failed to get lyrics count"),
            fallbackValue: null,
        }
    );

    return (
        <>
            <Text>Current lyrics provider: {lyricsInfo?.useLyric || "None"}</Text>
            {loading ? <Text>Loading lyrics count...</Text> : error ? <Text>Failed to get lyrics count</Text> : <Text>Lyrics count: {count}</Text>}
        </>
    );
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

export const settings = definePluginSettings({
    showSpotifyControls: {
        description: "Show Spotify Controls",
        type: OptionType.BOOLEAN,
        default: false,
    },
    showSpotifyLyrics: {
        description: "Show Spotify Lyrics",
        type: OptionType.BOOLEAN,
        default: false,
    },
    installTidalWithWS: {
        type: OptionType.COMPONENT,
        component: () => <InstallInstructions />
    },
    showTidalControls: {
        description: "Show Tidal Player",
        type: OptionType.BOOLEAN,
        default: false,
    },
    showTidalLyrics: {
        description: "Show Tidal Controls",
        type: OptionType.BOOLEAN,
        default: false,
    },
    hoverControls: {
        description: "Show controls on hover",
        type: OptionType.BOOLEAN,
        default: false,
        onChange: v => toggleHoverControls(v)
    },
    useSpotifyUris: {
        type: OptionType.BOOLEAN,
        description: "Open Spotify URIs instead of Spotify URLs. Will only work if you have Spotify installed and might not work on all platforms",
        default: false
    },
    previousButtonRestartsTrack: {
        type: OptionType.BOOLEAN,
        description: "Restart currently playing track when pressing the previous button if playtime is >3s",
        default: true
    },
    ShowMusicNoteOnNoLyrics: {
        description: "Show a music note icon when no lyrics are found",
        type: OptionType.BOOLEAN,
        default: true,
    },
    LyricsPosition: {
        description: "Position of the lyrics",
        type: OptionType.SELECT,
        options: [
            { value: "above", label: "Above Player(s)" },
            { value: "below", label: "Below  Player(s)", default: true },
        ],
    },
    LyricsProvider: {
        description: "Where lyrics are fetched from",
        type: OptionType.SELECT,
        options: [
            { value: Provider.Spotify, label: "Spotify (Musixmatch)", default: true },
            { value: Provider.Lrclib, label: "LRCLIB" },
        ],
    },
    LyricsConversion: {
        description: "Automatically translate or romanize lyrics",
        type: OptionType.SELECT,
        options: [
            { value: Provider.None, label: "None", default: true },
            { value: Provider.Translated, label: "Translate" },
            { value: Provider.Romanized, label: "Romanize" },
        ]
    },
    FallbackProvider: {
        description: "When a lyrics provider fails, try other providers",
        type: OptionType.BOOLEAN,
        default: true,
    },
    ShowFailedToasts: {
        description: "Hide toasts when lyrics fail to fetch",
        type: OptionType.BOOLEAN,
        default: true,
    },
    TidalLyricFetch: {
        description: "Custom URL for fetching lyrics",
        type: OptionType.STRING,
        default: "https://api.vmohammad.dev/",
        placeholder: "https://api.vmohammad.dev/",
        onChange: (value: string) => {
            if (!value.endsWith("/")) {
                value += "/";
            }
            if (URL.canParse(value)) {
                settings.store.TidalLyricFetch = value;
            } else {
                showToast("Invalid URL format for CustomUrl: " + value, Toasts.Type.FAILURE);
                settings.store.TidalLyricFetch = "https://api.vmohammad.dev/";
            }
        }
    },
    LyricDelay: {
        description: "",
        type: OptionType.SLIDER,
        default: 0,
        ...sliderOptions
    },
    PurgeLyricsCache: {
        description: "Purge the lyrics cache",
        type: OptionType.COMPONENT,
        component: () => (
            <Button
                color={Button.Colors.RED}
                onClick={() => {
                    clearLyricsCache();
                    showToast("Lyrics cache purged", Toasts.Type.SUCCESS);
                }}
            >
                Purge Cache
            </Button>
        ),
    },
});
