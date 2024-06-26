/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ShowAllRoles",
    description: "Show all members' roles on the pop-out again.",
    authors: [Devs.Luna],
    patches: [
        {
            find: ".Messages.VIEW_ALL_ROLES",
            replacement: {
                match: /return null!=.{13,17}:(\i)/,
                replace: "return $1"
            }
        }
    ]
});