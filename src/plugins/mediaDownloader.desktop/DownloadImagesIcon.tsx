/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";

const cl = classNameFactory("vc-dlimage-");

export function DownloadImagesIcon({ height = 24, width = 24, className }: { height?: number; width?: number; className?: string; }) {
    return (
        // AUTHOR: Ananthanath A X Kalaiism
        // LICENSE: Public Domain
        // COLLECTION: Kalai Oval Interface Icons
        // Downloaded from https://www.svgrepo.com/svg/502638/download-photo
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            className={classes(cl("icon"), className)}
            fillOpacity="0.0"
        >
            <path stroke="currentColor" d="M13 4H8.8C7.11984 4 6.27976 4 5.63803 4.32698C5.07354 4.6146 4.6146 5.07354 4.32698 5.63803C4 6.27976 4 7.11984 4 8.8V15.2C4 16.8802 4 17.7202 4.32698 18.362C4.6146 18.9265 5.07354 19.3854 5.63803 19.673C6.27976 20 7.11984 20 8.8 20H15.2C16.8802 20 17.7202 20 18.362 19.673C18.9265 19.3854 19.3854 18.9265 19.673 18.362C20 17.7202 20 16.8802 20 15.2V11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path stroke="currentColor" d="M4 16L8.29289 11.7071C8.68342 11.3166 9.31658 11.3166 9.70711 11.7071L13 15M13 15L15.7929 12.2071C16.1834 11.8166 16.8166 11.8166 17.2071 12.2071L20 15M13 15L15.25 17.25" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path stroke="currentColor" d="M18 3V8M18 8L16 6M18 8L20 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    );
}
