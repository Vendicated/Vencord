/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RenderSongInfo } from "@song-spotlight/api/handlers";
import type { Song } from "@song-spotlight/api/structs";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";

export const logger = new Logger("SongSpotlight");

export const cl = classNameFactory("vc-songspotlight-");

export function sid(song: Song) {
    return [song.service, song.type, song.id].join(";");
}

export function formatDurationMs(duration: number) {
    const seconds = Math.floor(duration / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function isProbablyListRender(song: Song) {
    return !["song", "track"].includes(song.type);
}

export function formatCoverTooltip(song: Song, render: RenderSongInfo) {
    if (["user", "artist"].includes(song.type)) {
        // "Jane Remover's Top tracks"
        return `${render.label}'s ${render.sublabel}`;
    } else {
        // "Star people by Jane Remover"
        return `${render.label} by ${render.sublabel}`;
    }
}
