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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Message, User } from "discord-types/general";

const defaultId = "-0";

const CachedInfo = new Array<string | Number>(defaultId, 0);
interface SearchFinishProps {
    type?: string,
    searchId?: string,
    guildId?: string | null,
    messages?: Array<Array<Message>>,
    threads?: Array<any>,
    members?: Array<User>,
    totalResults: Number,
    analyticsId?: null,
    hasError?: Boolean,
    doingHistoricalIndex?: Boolean,
    documentsIndexed?: Number;
}

function searchFinish(payload: SearchFinishProps) {
    console.log(payload);
    if (payload.messages && payload.messages.length) {
        CachedInfo[0] = payload.messages.pop()![0]?.id ?? defaultId;
        CachedInfo[1] = payload.totalResults;
        console.log("CHECKS " + CachedInfo[0]);
    }
}

export default definePlugin({
    name: "SearchFix",
    description: 'Fixes the annoying "We dropped the magnifying glass!" error.',
    settingsAboutComponent: () => <span style={{ color: "white" }}><i><b>This fix isn't perfect, so you may have to reload the search bar to fix issues.</b></i> Discord only allows a max offset of 5000 (this is what causes the magnifying glass error). This means that you can only see precisely 5000 messages into the past, and 5000 messages into the future (when sorting by old). This plugin just jumps to the opposite sorting method to try get around Discord's restriction, but if there is a large search result, and you try to view a message that is unobtainable with both methods of sorting, the plugin will simply show offset 0 (either newest or oldest message depending on the sorting method).</span>,
    authors: [Devs.Jaxx],
    patches: [
        {
            find: '"SearchStore"',
            replacement: {
                match: /(\i)\.offset=null!==\((\i)=(\i)\.offset\)&&void 0!==(\i)\?(\i):0/i,
                replace: (_, v, v1, query, v3, v4) => `$self.main(${query}), ${v}.offset = null !== (${v1} = ${query}.offset) && void 0 !== ${v3} ? ${v4} : 0`
            }
        }
    ],
    main(query: { offset: number; sort_order: string; max_id?: string, min_id?: string; }) {
        console.log("CHECKS");
        console.log(query);
        if (query.offset > 5000) {
            const currentAsc = query.sort_order === "asc"; // 1: old to new | 0: new to old

            if ((CachedInfo[1] as number) - 5000 > 5000) {
                query.offset = 0;
                if (CachedInfo[0] !== defaultId) {
                    if (currentAsc) {
                        query.min_id = CachedInfo[0] as string;
                    }
                    else {
                        query.max_id = CachedInfo[0] as string;
                    }
                }
            } else {
                query.sort_order = currentAsc ? "desc" : "asc";
                query.offset -= 5000;
            }
        }
    },
    flux: {
        "SEARCH_FINISH": searchFinish,
    },

});
