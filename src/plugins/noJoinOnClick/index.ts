/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoJoinOnClick",
    description: "Restores the behavior of clicking voice channels in the Active Now tab without joining",
    authors: [Devs.Moritzoni],

    patches: [{
        find: "h.default.selectVoiceChannel(r.id),",
        replacement: [
            {
                match: "h.default.selectVoiceChannel(r.id),",
                replace: "h.default.selectChannel(r.id),"
            }
        ]
    }]
});
