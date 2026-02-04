/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as handlers from "@song-spotlight/api/handlers";
import type { Song } from "@song-spotlight/api/structs";
import { setFetchHandler } from "@song-spotlight/api/util";
import { type IpcMainInvokeEvent, net } from "electron";

setFetchHandler(net.fetch as unknown as typeof fetch);

export async function parseLink(_: IpcMainInvokeEvent, link: string) {
    return handlers.parseLink(link);
}
export async function renderSong(_: IpcMainInvokeEvent, song: Song) {
    return handlers.renderSong(song);
}
export async function validateSong(_: IpcMainInvokeEvent, song: Song) {
    return handlers.validateSong(song);
}

export function clearCache() {
    return handlers.clearCache();
}
