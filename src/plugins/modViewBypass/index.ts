/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ModViewBypass",
    description: "Open the mod view sidebar in guilds you don't have moderator permissions in, or where the experiment is disabled.",
    authors: [Devs.Sqaaakoi],
    patches: [
        "useCanAccessGuildMemberModView",
        "canAccessGuildMemberModViewWithExperiment",
        "isInGuildMemberModViewExperiment",
        "useGuildMemberModViewExperiment",
    ].map(f => {
        return {
            find: `${f}:`,
            replacement: {
                match: new RegExp(`(${f}:function\\(\\){return\\s)\\i`),
                replace: "$1()=>true;",
            }
        };
    })
});
