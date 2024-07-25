/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    hideAtSymbol: {
        type: OptionType.BOOLEAN,
        description: "Whether the the @-symbol should be hidden.",
        default: false
    }
});
