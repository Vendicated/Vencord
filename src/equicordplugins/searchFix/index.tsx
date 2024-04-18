/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "SearchFix",
    description: 'Fixes the annoying "We dropped the magnifying glass!" error.',
    settingsAboutComponent: () => <span style={{ color: "white" }}><i><b>This fix isn't perfect, so you may have to reload the search bar to fix issues.</b></i> Discord only allows a max offset of 5000 (this is what causes the magnifying glass error). This means that you can only see precisely 5000 messages into the past, and 5000 messages into the future (when sorting by old). This plugin just jumps to the opposite sorting method to try get around Discord's restriction, but if there is a large search result, and you try to view a message that is unobtainable with both methods of sorting, the plugin will simply show offset 0 (either newest or oldest message depending on the sorting method).</span>,
    authors: [EquicordDevs.jaxx],
    patches: [
        {
            find: '"SearchStore"',
            replacement: {
                match: /(\i)\.offset=null!==\((\i)=(\i)\.offset\)&&void 0!==(\i)\?(\i):0/i,
                replace: (_, v, v1, query, v3, v4) => `$self.main(${query}), ${v}.offset = null !== (${v1} = ${query}.offset) && void 0 !== ${v3} ? ${v4} : 0`
            }
        }
    ],
    main(query) {
        if (query.offset <= 5000) return;
        query.sort_order = query.sort_order === "asc" ? "desc" : "asc";

        if (query.offset > 5000 - 5000) {
            query.offset = 0;
        } else {
            query.offset -= 5000;
        }
    }
});
