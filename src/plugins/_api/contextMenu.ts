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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ContextMenuAPI",
    description: "API for adding/removing items to/from context menus.",
    authors: [Devs.Nuckyz, Devs.Ven, Devs.Kyuuhachi],
    required: true,

    patches: [
        {
            find: "♫ (つ｡◕‿‿◕｡)つ ♪",
            replacement: {
                match: /(?=let{navId:)(?<=function \i\((\i)\).+?)/,
                replace: "$1=Vencord.Api.ContextMenu._usePatchContextMenu($1);"
            }
        },
        {
            find: "navId:",
            all: true,
            noWarn: true,
            replacement: [
                {
                    match: /navId:(?=.+?([,}].*?\)))/g,
                    replace: (m, rest) => {
                        // Check if this navId: match is a destructuring statement, ignore it if it is
                        const destructuringMatch = rest.match(/}=.+/);
                        if (destructuringMatch == null) {
                            return `contextMenuAPIArguments:typeof arguments!=='undefined'?arguments:[],${m}`;
                        }
                        return m;
                    }
                }
            ]
        }
    ]
});
