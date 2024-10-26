/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUrlExtension } from "./getUrlExtension";

const audioExtensions = ["mp3", "wav", "ogg", "aac", "m4a", "wma", "flac"];

export function isAudio(url: string) {
    const extension = getUrlExtension(url);
    return extension && audioExtensions.includes(extension);
}
