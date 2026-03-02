/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "DMKeeper",
    description: "Prevents Discord from automatically hiding old DM conversations from your sidebar.",
    authors: [EquicordDevs.Awizz],
    patches: [
        {
            find: "getSortedPrivateChannels(){",
            replacement: {
                match: /(\i)\.length>(\i)&&(\i)\.shift\(\)/,
                replace: "false"
            }
        }
    ],
});
