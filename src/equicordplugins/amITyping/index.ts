/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "AmITyping",
    description: "Shows you if other people can see you typing.",
    authors: [EquicordDevs.MrDiamond],

    patches: [
        {
            find: "\"handleDismissInviteEducation\"",
            replacement: {
                match: /\i\.default\.getCurrentUser\(\)/,
                replace: "\"\""
            }
        }
    ]
});
