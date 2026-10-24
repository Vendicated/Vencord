/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    showStreaming: {
        description: "Streaming Badge",
        type: OptionType.BOOLEAN,
        default: false
    },
    showGameVariety: {
        description: "Game Variety Badge",
        type: OptionType.BOOLEAN,
        default: false
    },
    showGameTime: {
        description: "Game Time Badge",
        type: OptionType.BOOLEAN,
        default: false
    },
    showAccountAge: {
        description: "Account Age Badge",
        type: OptionType.BOOLEAN,
        default: false
    },
    badgeOverflowLimit: {
        description: "Enable Badge Overflow Limit",
        type: OptionType.BOOLEAN,
        default: false
    }
});

export default definePlugin({
    name: "CustomizeMembersBadge",
    description: "Customize visibility of other member's badges.",
    authors: [Devs.f3tch],
    settings,
    patches: [
        // hide the new badges
        {
            find: "pendingBadgeDisplayOrder",
            replacement: {
                match: /\},\[\i,\i,\i,\i,\i,\i\]\);if\(0===(\i)\.length&&!\i\)return null;/,
                replace: "$&$1=$1.filter(e=>!$self.shouldHide(e.id));"
            }
        },
        // update badge list component to setting changes
        {
            find: "UserProfileBadgeListRows",
            replacement: {
                match: /(\i)=\(0,\i\.\i\)\(\{location:"UserProfileBadgeListRows"\}\),/,
                replace: "$1=$self.settings.use(),"
            }
        },
        // remove badge row overflow limit causing "+1/+2/+3" button to appear (depending on the setting chosen)
        {
            find: "UserProfileBadgeListRows",
            replacement: {
                match: /let (\i)=(\i)&&!(\i),/,
                replace: "let $1=$2&&!$3&&$self.settings.store.badgeOverflowLimit,"
            }
        }
    ],
    shouldHide(badgeId: string) {
        switch (badgeId) {
            case "streaming": return !settings.store.showStreaming;
            case "game_variety": return !settings.store.showGameVariety;
            case "game_time": return !settings.store.showGameTime;
            case "account_age": return !settings.store.showAccountAge;
            default: return false;
        }
    }
});
