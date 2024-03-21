/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ModViewBypass",
    description: "Open the mod view sidebar in guilds you don't have moderator permissions in.",
    authors: [Devs.Sqaaakoi],
    patches: [
        "useCanAccessGuildMemberModView",
        // these can probably be removed safely now and revert to the regular patch style
        "canAccessGuildMemberModViewWithExperiment",
        "isInGuildMemberModViewExperiment",
        "useGuildMemberModViewExperiment",
    ].map(f => ({
        find: `${f}:`,
        replacement: {
            match: new RegExp(`(${f}:function\\(\\){return\\s)\\i`),
            replace: "$1()=>true;",
        }
    }))
});
