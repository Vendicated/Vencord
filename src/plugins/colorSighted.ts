/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ColorSighted",
    description: "Removes the colorblind-friendly icons from statuses, just like 2015-2017 Discord",
    authors: [Devs.lewisakura],
    patches: [
        {
            find: "Masks.STATUS_ONLINE",
            replacement: {
                match: /Masks\.STATUS_(?:IDLE|DND|STREAMING|OFFLINE)/g,
                replace: "Masks.STATUS_ONLINE"
            }
        },
        {
            find: ".AVATAR_STATUS_MOBILE_16;",
            replacement: {
                match: /(\.fromIsMobile,.+?)\i.status/,
                replace: (_, rest) => `${rest}"online"`
            }
        }
    ]
});
