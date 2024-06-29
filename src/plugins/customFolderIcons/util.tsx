/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { folderProp } from ".";
import settings, { folderIcon, folderIconsData } from "./settings";

export async function setFolderUrl(props: folderProp, newData: folderIcon) {
    // FIXME: https://canary.discord.com/channels/1015060230222131221/1032770730703716362/1256504513125158924
    if(!settings.store.folderIcons){
        settings.store.folderIcons = {};
    }
    const folderSettings = (settings.store.folderIcons as folderIconsData);
    const data = folderSettings[props.folderId] ?? {} as folderIcon;
    for (const k in newData){
        data[k] = newData[k];
    }
    folderSettings[props.folderId] = data;
}

/**
    * @param rgbVal RGB value
    * @param alpha alpha bewteen zero and 1
    */
export function int2rgba(rgbVal: number, alpha: number = 1) {
    const b = rgbVal & 0xFF,
        g = (rgbVal & 0xFF00) >>> 8,
        r = (rgbVal & 0xFF0000) >>> 16;
    return `rgba(${[r, g, b].join(",")},${alpha})`;
}
