/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoHolidayNotifications",
    description: "Disable Discord's holiday notification sound packs",
    authors: [Devs.hadesflames],

    patches: [
        {
            find: 'persistKey="SoundpackStore"',
            replacement: {
                match: /(?<=getSoundpack\(\)\{return )\i\.soundpack/,
                replace: '"classic"'
            }
        }
    ]
});
