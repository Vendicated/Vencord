/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "PlainFolderIcon",
    description: "Dont show the small guild icons in folders",
    authors: [Devs.botato],

    patches: [
        {
            find: "#{intl::GUILD_FOLDER_TOOLTIP_A11Y_LABEL}",
            replacement: [
                {
                    // Discord always renders both plain and guild icons folders and uses a css transtion to switch between them
                    match: /\.slice\(0,4\).+?\]:(\i),\[\i\.\i\]:!\1/,
                    replace: (m, hasFolderButtonContent) => `${m},"vc-plainFolderIcon-plain":!${hasFolderButtonContent}`
                }

            ]
        }
    ]
});
