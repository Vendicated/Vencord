/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { MessageActions } from "@webpack/common";

const settings = definePluginSettings({
    noShiftDelete: {
        type: OptionType.BOOLEAN,
        description: "Remove requirement to hold shift for deleting a message.",
        default: true,
    },
    noShiftPin: {
        type: OptionType.BOOLEAN,
        description: "Remove requirement to hold shift for pinning a message.",
        default: true,
    },
});

const PinActions = findByPropsLazy("pinMessage", "unpinMessage");

export default definePlugin({
    name: "ShowAllMessageButtons",
    description: "Always show all message buttons no matter if you are holding the shift key or not.",
    authors: [Devs.Nuckyz, EquicordDevs.mochienya],
    settings,

    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}",
            replacement: [
                {
                    match: /isExpanded:\i&&(.+?),/,
                    replace: "isExpanded:$1,"
                },
                {
                    predicate: () => settings.store.noShiftDelete,
                    match: /onClick:.{10,20}(?=,dangerous:!0)/,
                    replace: "onClick:() => $self.deleteMessage(arguments[0].message)",
                },
                {
                    predicate: () => settings.store.noShiftPin,
                    match: /onClick:.{10,30}(?=\},"pin")/,
                    replace: "onClick:() => $self.toggleMessagePin(arguments[0]),"
                }
            ]
        },
    ],

    deleteMessage({ channel_id, id }) {
        MessageActions.deleteMessage(channel_id, id);
    },
    toggleMessagePin({ channel, message }) {
        if (message.pinned)
            return PinActions.unpinMessage(channel, message.id);

        PinActions.pinMessage(channel, message.id);
    },
});
