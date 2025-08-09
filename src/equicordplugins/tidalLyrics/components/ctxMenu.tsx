/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/misc";
import { findComponentByCodeLazy } from "@webpack";
import { FluxDispatcher, Menu } from "@webpack/common";

import { useLyrics } from "./util";

const CopyIcon = findComponentByCodeLazy(" 1-.5.5H10a6");

export function LyricsContextMenu() {
    const { lyrics, currLrcIndex } = useLyrics({ scroll: false });
    const currLyric = lyrics?.[currLrcIndex ?? NaN];

    return (
        <Menu.Menu
            navId="tidal-lyrics-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Tidal Lyrics Menu"
        >
            <Menu.MenuItem
                key="copy-lyric"
                id="copy-lyric"
                label="Copy current lyric"
                disabled={!currLyric?.text}
                action={() => copyWithToast(currLyric!.text!, "Lyric copied!")}
                icon={CopyIcon}
            />
        </Menu.Menu>
    );
}
