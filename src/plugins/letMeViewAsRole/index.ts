/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "LetMeViewAsRole",
    description: "View as role regardless of permission",
    authors: [Devs.niko],

    patches: [
        // Role list patch
        {
            find: "}canImpersonateRole(",
            replacement: {
                match: /\i\.can\(\i\.\i\.MANAGE_GUILD,\i\)&&\i\.can\(\i\.\i\.MANAGE_ROLES,\i\)/,
                replace: "true"
            }
        },
        // Patch "select roles" dropdown, otherwise it will pop out "You do not have permissions to use this feature" instead of the roles list
        {
            find: ".VIEW_AS_ROLES_NO_ACCESS",
            replacement: {
                match: /\i\.isOwner\(\i\.id\)/,
                replace: "true"
            }
        }
    ]
});
