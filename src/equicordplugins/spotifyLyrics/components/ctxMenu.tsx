/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/misc";
import { findComponentByCodeLazy } from "@webpack";
import { FluxDispatcher, Menu } from "@webpack/common";

import { Provider } from "../providers/types";
import { useLyrics } from "./util";

const CopyIcon = findComponentByCodeLazy(" 1-.5.5H10a6");

const lyricsActualProviders = [Provider.Lrclib, Provider.Spotify];
const lyricsAlternative = [Provider.Translated, Provider.Romanized];

function ProviderMenuItem(toProvider: Provider, currentProvider?: Provider) {
    return (
        (!currentProvider || currentProvider !== toProvider) && (
            <Menu.MenuItem
                key={`switch-provider-${toProvider.toLowerCase()}`}
                id={`switch-provider-${toProvider.toLowerCase()}`}
                label={`Switch to ${toProvider}`}
                action={() => {
                    FluxDispatcher.dispatch({
                        // @ts-ignore
                        type: "SPOTIFY_LYRICS_PROVIDER_CHANGE",
                        provider: toProvider,
                    });
                }}
            />
        )
    );
}

export function LyricsContextMenu() {
    const { lyricsInfo, currLrcIndex } = useLyrics();

    const currentLyrics = lyricsInfo?.lyricsVersions[lyricsInfo.useLyric];
    const hasAShowingLyric = currLrcIndex !== null && currLrcIndex >= 0;
    const hasLyrics = !!(lyricsInfo?.lyricsVersions[Provider.Lrclib] || lyricsInfo?.lyricsVersions[Provider.Spotify]);

    return (
        <Menu.Menu
            navId="spotify-lyrics-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Spotify Lyrics Menu"
        >
            {hasAShowingLyric && (
                <Menu.MenuItem
                    key="copy-lyric"
                    id="copy-lyric"
                    label="Copy lyric"
                    action={() => {
                        copyWithToast(currentLyrics![currLrcIndex].text!, "Lyric copied!");
                    }}
                    icon={CopyIcon}
                />
            )}
            <Menu.MenuItem
                navId="spotify-lyrics-provider"
                id="spotify-lyrics-provider"
                label="Lyrics Provider"
            >
                {lyricsActualProviders.map(provider =>
                    ProviderMenuItem(provider, lyricsInfo?.useLyric)
                )}
                {hasLyrics && lyricsAlternative.map(provider =>
                    ProviderMenuItem(provider, lyricsInfo?.useLyric)
                )}
            </Menu.MenuItem>
        </Menu.Menu>
    );
}
