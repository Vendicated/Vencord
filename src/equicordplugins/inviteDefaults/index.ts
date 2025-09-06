/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    inviteDuration: {
        type: OptionType.SELECT,
        description: "Invite Duration",
        options: [
            { label: "30 minutes", value: 1800 },
            { label: "1 hour", value: 3600 },
            { label: "6 hours", value: 21600 },
            { label: "12 hours", value: 43200 },
            { label: "1 day", value: 86400 },
            { label: "7 days", value: 604800 },
            { label: "Forever", value: 0, default: true },
        ],
    },
    maxUses: {
        type: OptionType.SELECT,
        description: "Invite Use Count",
        options: [
            { label: "Infinite", value: 0, default: true },
            { label: "1", value: 1 },
            { label: "5", value: 5 },
            { label: "10", value: 10 },
            { label: "25", value: 25 },
            { label: "50", value: 50 },
            { label: "100", value: 100 },
        ],
    },
    temporaryMembership: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Temporary Membership",
    },
});

export default definePlugin({
    name: "InviteDefaults",
    description: "Allows you to edit the default values when creating server invites.",
    authors: [EquicordDevs.VillainsRule],
    settings,
    patches: [
        {
            find: ".GUILD_CREATE_INVITE_SUGGESTION,defaultMaxAge",
            replacement: [
                {
                    match: /(?<=maxAge:)null!=\(\i=null!=\i\?\i:\i\)\?\i:\i.\i/,
                    replace: "$self.settings.store.inviteDuration"
                },
                {
                    match: /(?<=maxUses:)null!=\i&&0!==\i\?\i:\i.value/,
                    replace: "$self.settings.store.maxUses"
                },
                {
                    match: /(?<=temporary:)null!=\i&&\i/,
                    replace: "$self.settings.store.temporaryMembership"
                }
            ]
        }
    ]
});
