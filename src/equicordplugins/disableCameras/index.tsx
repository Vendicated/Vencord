/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "DisableCameras",
    description: "Disables cameras in a call by default",
    authors: [Devs.Joona],
    patches: [
        {
            find: 'logger.error("Connect called',
            replacement: {
                match: /case 12:this.emit\("video",(\i\.user_id).+?;/,
                replace: '$&findByProps("setDisableLocalVideo").setDisableLocalVideo($1, "DISABLED");'
            }
        }
    ]
});
