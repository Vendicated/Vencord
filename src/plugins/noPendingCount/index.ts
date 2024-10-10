/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
            find: "getPendingCount(){",
            predicate: () => settings.store.hideFriendRequestsCount,
            replacement: {
                match: /(?<=getPendingCount\(\)\{)/,
                replace: "return 0;"
            }
        },
        // Message requests hook
        {
            find: "getMessageRequestsCount(){",
            predicate: () => settings.store.hideMessageRequestsCount,
            replacement: {
                match: /(?<=getMessageRequestsCount\(\)\{)/,
                replace: "return 0;"
            }
        },
        // This prevents the Message Requests tab from always hiding due to the previous patch (and is compatible with spam requests)
        // In short, only the red badge is hidden. Button visibility behavior isn't changed.
        {
            find: ".getSpamChannelsCount()",
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
                // The two groups inside the first group grab the minified names of the variables,
                // they are then referenced later to find unviewedTrialCount + unviewedDiscountCount.
                match: /(?<=\{unviewedTrialCount:(\i),unviewedDiscountCount:(\i)\}.{0,200}\i=)\1\+\2/,
                replace: "0"
            }
        }
    ],

    getRealMessageRequestCount() {
        return MessageRequestStore.getMessageRequestChannelIds().size;
    }
});
