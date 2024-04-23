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

class PageInfo {
    start: string = defaultId;
    end: string = defaultId;
    constructor(st: string, en: string) {
        this.start = st;
        this.end = en;
    }
}
class Cache {
    pages: Map<number, PageInfo> = new Map<number, PageInfo>();
    currentPage: number = 0;
    isAltered: boolean = false;
}

const CachedInfo: Cache = new Cache();
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
    if (payload.messages && payload.messages.length) {
        const startMsg = payload.messages[0];
        const endMsg = payload.messages[payload.messages.length - 1];
        CachedInfo.pages.set(CachedInfo.currentPage, new PageInfo(startMsg[0].id, endMsg[0].id));
    }
}

export default definePlugin({
    name: "SearchForever",
    description: "Allows you to scroll search result further than 400 pages.",
    settingsAboutComponent: () => <span style={{ color: "white" }}><i><b>This fix isn't perfect, so you will not be able to jump to any page.</b></i> This only works while you open pages sequentially. </span>,
    authors: [Devs.CatGirlDShadow, Devs.Jaxx],
    flux: {
        "SEARCH_FINISH": searchFinish,
    },
    patches: [
        {
            find: '"SearchStore"',
            replacement: {
                match: /(\i)\.offset=null!==\((\i)=(\i)\.offset\)&&void 0!==(\i)\?(\i):0/i,
                replace: (_, v, v1, query, v3, v4) => `$self.processQuery(${query}), ${v}.offset = null !== (${v1} = ${query}.offset) && void 0 !== ${v3} ? ${v4} : 0`
            }
        }
    ],
    processQuery(query: { offset: number; sort_order: string; max_id?: string, min_id?: string; }) {
        console.log(query);
        if (query.offset === 0) {
            CachedInfo.isAltered = false;
            return;
        }
        let currentPage = query.offset ? Math.floor(query.offset / 25) : 0;
        if (CachedInfo.isAltered) {
            currentPage = CachedInfo.currentPage + (query.offset === 25 ? -1 : 1);
        }
        CachedInfo.currentPage = currentPage;
        if (CachedInfo.isAltered) {
            if (query.offset === 25) {
                if (CachedInfo.currentPage < 200) {
                    query.offset = CachedInfo.currentPage * 25;
                    CachedInfo.isAltered = false;
                    return;
                }
            }
            this.renderCurrentPage(query);
            return;
        }
        if (query.offset === 10000) {
            this.renderCurrentPage(query);
        }
    },
    renderCurrentPage(query: { offset: number; sort_order: string; max_id?: string, min_id?: string; }) {
        const currentAsc = query.sort_order === "asc"; // 1: old to new | 0: new to old
        const offsetPage = CachedInfo.currentPage - 3;
        if (CachedInfo.pages.has(offsetPage)) {
            CachedInfo.isAltered = true;
            const limitToId = CachedInfo.pages.get(offsetPage)!.end as string;
            if (currentAsc) {
                query.min_id = limitToId;
            }
            else {
                query.max_id = limitToId;
            }
            query.offset = 50; // i = 0, i+1 = 25, i+2 = 50
        }
        else {
            query.offset = 399 * 25;
            CachedInfo.isAltered = false;
        }

    },
});
