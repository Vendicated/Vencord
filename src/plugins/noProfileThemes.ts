/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoProfileThemes",
    description: "Completely removes Nitro profile themes",
    authors: [Devs.TheKodeToad],
    patches: [
        {
            find: ".NITRO_BANNER,",
            replacement: {
                // = isPremiumAtLeast(user.premiumType, TIER_2)
                match: /=(?=\i\.\i\.isPremiumAtLeast\(null==(\i))/,
                // = user.banner && isPremiumAtLeast(user.premiumType, TIER_2)
                replace: "=$1?.banner&&"
            }
        },
        {
            find: "().avatarPositionPremiumNoBanner,default:",
            replacement: {
                // premiumUserWithoutBanner: foo().avatarPositionPremiumNoBanner, default: foo().avatarPositionNormal
                match: /\.avatarPositionPremiumNoBanner(?=,default:\i\(\)\.(\i))/,
                // premiumUserWithoutBanner: foo().avatarPositionNormal...
                replace: ".$1"
            }
        },
        {
            find: ".hasThemeColors=function(){",
            replacement: {
                match: /(?<=key:"canUsePremiumProfileCustomization",get:function\(\){return)/,
                replace: " false;"
            }
        }
    ]
});
