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
            find: ".folderPreviewGuildIconError",
            replacement: [
                {
                    // Discord always renders both plain and guild icons folders and uses a css transtion to switch between them
                    match: /(?<=.folderButtonContent]:(!\i))/,
                    replace: (_, hasFolderButtonContentClass) => `,"vc-plainFolderIcon-plain":${hasFolderButtonContentClass}`
                }

            ]
        }
    ]
});
