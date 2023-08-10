/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export default definePluginSettings({
    notices: {
        type: OptionType.BOOLEAN,
        description: "Also show a notice at the top of your screen when removed (use this if you don't want to miss any notifications).",
        default: false
    },
    offlineRemovals: {
        type: OptionType.BOOLEAN,
        description: "Notify you when starting discord if you were removed while offline.",
        default: true
    },
    friends: {
        type: OptionType.BOOLEAN,
        description: "Notify when a friend removes you",
        default: true
    },
    friendRequestCancels: {
        type: OptionType.BOOLEAN,
        description: "Notify when a friend request is cancelled",
        default: true
    },
    servers: {
        type: OptionType.BOOLEAN,
        description: "Notify when removed from a server",
        default: true
    },
    groups: {
        type: OptionType.BOOLEAN,
        description: "Notify when removed from a group chat",
        default: true
    }
});
