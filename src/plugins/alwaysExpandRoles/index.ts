/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { migratePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

migratePluginSettings("AlwaysExpandRoles", "ShowAllRoles");
export default definePlugin({
    name: "AlwaysExpandRoles",
    description: "Always expands the role list in profile popouts",
    authors: [Devs.surgedevs],
    patches: [
        {
            find: 'action:"EXPAND_ROLES"',
            replacement: [
                {
                    match: /(roles:\i(?=.+?(\i)\(!0\)[,;]\i\({action:"EXPAND_ROLES"}\)).+?\[\i,\2\]=\i\.useState\()!1\)/,
                    replace: (_, rest, setExpandedRoles) => `${rest}!0)`
                },
                {
                    // Fix not calculating non-expanded roles because the above patch makes the default "expanded",
                    // which makes the collapse button never show up and calculation never occur
                    match: /(?<=useLayoutEffect\(\(\)=>{if\()\i/,
                    replace: isExpanded => "false"
                }
            ]
        }
    ]
});
