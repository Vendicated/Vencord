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
        {
            find: "canAccessGuildMemberModViewWithExperiment:",
            replacement: {
                match: /canAccessGuildMemberModViewWithExperiment:function\(\){return\s\i/,
                replace: "canAccessGuildMemberModViewWithExperiment:function(){return ()=>true;",
            },
        },
        {
            find: "useCanAccessGuildMemberModView:",
            replacement: {
                match: /\i.default.hasAny\(/,
                replace: "true; (",
            },
        },
        {
            find: "isInGuildMemberModViewExperiment:",
            replacement: {
                match: /isInGuildMemberModViewExperiment:function\(\){return\s\i/,
                replace: "isInGuildMemberModViewExperiment:function(){return ()=>true;",
            },
        },
        {
            find: "useGuildMemberModViewExperiment:",
            replacement: {
                match: /useGuildMemberModViewExperiment:function\(\){return\s\i/,
                replace: "useGuildMemberModViewExperiment:function(){return ()=>true;",
            },
        },
    ],
});
