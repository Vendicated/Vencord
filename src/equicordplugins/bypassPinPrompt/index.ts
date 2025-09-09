/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "BypassPinPrompt",
    description: "Bypass the pin prompt when using the pin functions",
    authors: [Devs.thororen],
    patches: [
        {
            find: '"Channel Pins"',
            replacement: {
                match: /(?<=(\i\.\i\.unpinMessage\(\i,\i\.id\)):)\i\.\i\.confirmUnpin\(\i,\i\)/,
                replace: "$1"
            }
        },
        {
            find: 'source:"message-actions"',
            replacement: [
                {
                    match: /(?<=(\i\.\i\.pinMessage\(\i,\i\.id\)):)\i\.\i\.confirmPin\(\i,\i\)/,
                    replace: "$1"
                },
                {
                    match: /(?<=(\i\.\i\.unpinMessage\(\i,\i\.id\)):)\i\.\i\.confirmUnpin\(\i,\i\)/,
                    replace: "$1"
                }
            ]
        },
        {
            find: 'id:"pin"',
            replacement: [
                {
                    match: /(?<=(\i\.\i\.pinMessage\(\i,\i\.id\)):)\i\.\i\.confirmPin\(\i,\i\)/,
                    replace: "$1"
                },
                {
                    match: /(?<=(\i\.\i\.unpinMessage\(\i,\i\.id\)):)\i\.\i\.confirmUnpin\(\i,\i\)/,
                    replace: "$1"
                }
            ]
        },
    ],
});
