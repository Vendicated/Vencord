/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

const MessageRequestStore = findByPropsLazy("getMessageRequestsCount");

const settings = definePluginSettings({
    hideFriendRequestsCount: {
        type: OptionType.BOOLEAN,
        description: "Hide incoming friend requests count",
        default: true,
        restartNeeded: true
    },
    hideMessageRequestsCount: {
        type: OptionType.BOOLEAN,
        description: "Hide message requests count",
        default: true,
        restartNeeded: true
    },
    hidePremiumOffersCount: {
        type: OptionType.BOOLEAN,
        description: "Hide nitro offers count",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "NoPendingCount",
    description: "Removes the ping count of incoming friend requests, message requests, and nitro offers.",
    authors: [Devs.amia],

    settings: settings,

    // Functions used to determine the top left count indicator can be found in the single module that calls getUnacknowledgedOffers(...)
    // or by searching for "showProgressBadge:"
    patches: [
        {
            find: ".getPendingCount=",
            predicate: () => settings.store.hideFriendRequestsCount,
            replacement: {
                match: /(?<=\.getPendingCount=function\(\)\{)/,
                replace: "return 0;"
            }
        },
        {
            find: ".getMessageRequestsCount=",
            predicate: () => settings.store.hideMessageRequestsCount,
            replacement: {
                match: /(?<=\.getMessageRequestsCount=function\(\)\{)/,
                replace: "return 0;"
            }
        },
        // This prevents the Message Requests tab from always hiding due to the previous patch (and is compatible with spam requests)
        // In short, only the red badge is hidden. Button visibility behavior isn't changed.
        {
            find: ".getSpamChannelsCount(),",
            predicate: () => settings.store.hideMessageRequestsCount,
            replacement: {
                match: /(?<=getSpamChannelsCount\(\),\i=)\i\.getMessageRequestsCount\(\)/,
                replace: "$self.getRealMessageRequestCount()"
            }
        },
        {
            find: "showProgressBadge:",
            predicate: () => settings.store.hidePremiumOffersCount,
            replacement: {
                match: /\(function\(\){return \i\.\i\.getUnacknowledgedOffers\(\i\)\.length}\)/,
                replace: "(function(){return 0})"
            }
        }
    ],

    getRealMessageRequestCount() {
        return MessageRequestStore.getMessageRequestChannelIds().size;
    }
});
