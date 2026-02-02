/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RenderSongInfo } from "@song-spotlight/api/handlers";
import { Song } from "@song-spotlight/api/structs";
import { PluginNative } from "@utils/types";
import { useEffect, useState } from "@webpack/common";

import { sid } from "./lib/utils";

export function useRender(song: Song) {
    const [failed, setFailed] = useState(false);
    const [render, setRender] = useState<RenderSongInfo | null>(null);

    useEffect(() => {
        setFailed(false);
        setRender(null);
        renderSong(song)
            .catch(() => null)
            .then(info => info ? setRender(info) : setFailed(true));
    }, [sid(song)]);

    return { failed, render };
}

export function useLink(song: Song) {
    const [failed, setFailed] = useState(false);
    const [link, setLink] = useState<string | null>(null);

    useEffect(() => {
        setFailed(false);
        setLink(null);
        rebuildLink(song)
            .catch(() => null)
            .then(link => link ? setLink(link) : setFailed(true));
    }, [sid(song)]);

    return { failed, link };
}

export const { parseLink, rebuildLink, renderSong, validateSong, clearCache } = VencordNative.pluginHelpers
    .SongSpotlight as PluginNative<typeof import("./native")>;
