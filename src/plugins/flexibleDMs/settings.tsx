/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Button } from "@webpack/common";

import { Layout } from "./model";
import { resetOrder } from "./state";

export const settings = definePluginSettings({
    keepFoldersOnTop: {
        type: OptionType.BOOLEAN,
        displayName: "Always keep folders on top",
        description: "Keep folders above unpinned DMs, including chats with new messages. PinDMs categories always stay above folders.",
        default: false
    },
    persistence: {
        type: OptionType.BOOLEAN,
        displayName: "Persistence",
        description: "Keep manually arranged chat order after restarting Discord.",
        default: false
    },
    resetOrder: {
        type: OptionType.COMPONENT,
        component: () => <Button onClick={resetOrder}>Reset chat order</Button>
    },
    accounts: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, Layout>,
        hidden: true
    }
});
