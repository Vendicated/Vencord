/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "FixedForumTags",
    authors: [Devs.sadan],
    description: "Allows you to search and filter by all forum tags, even those that only moderators can add",

    patches: [
        // shows overflow forum tags only when second arg is true (orig func only takes one arg)
        // we need to filter with a second arg because this func is also used for adding tags when posting
        {
            find: ':"REQUEST_FORUM_UNREADS"',
            replacement: {
                match: /(?=!\i.moderated)/,
                replace: "arguments[1]||"
            }
        },
        // patches the dropdown menu where overflow forum tags are listed,
        // sets the second parameter to true to not ignore moderated forum tags
        {
            find: "\"-all-tags-dropdown-navigator\"",
            replacement: {
                match: /((\i)=\(0,\i\.\i\)\(\i)(\))(?=.*children:\2\.map\()/,
                replace: "$1,true$3"
            }
        }
    ]
});
