/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
