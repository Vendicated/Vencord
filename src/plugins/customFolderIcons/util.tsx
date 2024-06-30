/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 sadan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { folderProp } from ".";
import settings, { folderIcon, folderIconsData } from "./settings";

export async function setFolderData(props: folderProp, newData: folderIcon) {
    if(!settings.store.folderIcons){
        settings.store.folderIcons = {};
    }
    const folderSettings = (settings.store.folderIcons as folderIconsData);
    folderSettings[props.folderId] = newData;
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
