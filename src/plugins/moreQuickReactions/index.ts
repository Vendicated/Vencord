/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    reactionCount: {
        description: "Number of reactions (0-42)",
        type: OptionType.NUMBER,
        default: 5
    },
});

export default definePlugin({
    name: "MoreQuickReactions",
    description: "Increases the number of reactions available in the Quick React hover menu",
    authors: [Devs.iamme],
    settings,

    get reactionCount() {
        return settings.store.reactionCount;
    },

    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}",
            replacement: {
                match: /(?<=length>=3\?.{0,40})\.slice\(0,3\)/,
                replace: ".slice(0,$self.reactionCount)"
            }
        }
    ],
});
