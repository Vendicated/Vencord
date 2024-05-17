/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoDefaultHangStatus",
    description: "Disable the default hang status when joining voice channels",
    authors: [Devs.D3SOX],

    patches: [
        {
            find: "HangStatusTypes.CHILLING)",
            replacement: {
                match: /{enableHangStatus:(\i),/,
                replace: "{_enableHangStatus:$1=false,"
            }
        }
    ]
});
