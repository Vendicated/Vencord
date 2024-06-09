/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    fakeMute: {
        description: "Make everyone believe you're muted (you can still speak)",
        type: OptionType.BOOLEAN,
        default: true,
    },
    fakeDeafen: {
        description: "Make everyone believe you're deafened (you can still hear)",
        type: OptionType.BOOLEAN,
        default: true,
    },
    muteOnFakeDeafen: {
        description: "Make your mic mute when you fake deafen (less suspicious)",
        type: OptionType.BOOLEAN,
        default: true,
    },
});
