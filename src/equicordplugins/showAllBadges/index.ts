/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ShowAllBadges",
    description: "Shows every profile badge instead of collapsing the rest behind +n",
    tags: ["Appearance", "Customisation"],
    authors: [EquicordDevs.itzmeshadow999],

    patches: [
        {
            find: "UserProfileBadgeListRows",
            replacement: {
                match: /let (\i)=(\i)&&!(\i),(\i)=\1\?Math\.max\(/,
                replace: "let $1=!1,$4=$1?Math.max("
            }
        }
    ]
});
