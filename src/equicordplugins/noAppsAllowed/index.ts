/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoAppsAllowed",
    description: "returns the bot's tag :skulk:",
    authors: [EquicordDevs.meowabyte],
    patches: [
        {
            find: '"#{intl::APP_TAG::hash}":',
            replacement: {
                match: /(#{intl::APP_TAG::hash}":\[").*?("\])/,
                replace: "$1BOT$2"
            }
        }
    ]
});
