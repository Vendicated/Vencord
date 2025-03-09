/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, RelationshipStore, TextInput, UserStore } from "@webpack/common";

let lastSearch = "";
let updateFunc = (v: any) => { };

export default definePlugin({
    name: "BetterBlockedUsers",
    description: "Allows you to search in blocked users list and makes names selectable in settings.",
    authors: [EquicordDevs.TheArmagan],
    patches: [
        {
            find: '"],{numberOfBlockedUsers:',
            replacement: [
                {
                    match: /(function \S+\((\S{1,3})\).{0,100}className:_\.header,children:\[.{0,500}numberOfIgnoredUsers:\S{1,3}}\)}\)]}\))/,
                    replace: "$1,$2.listType==='blocked'?$self.renderSearchInput():null"
                },
                {
                    match: /(function \S+\((\S{1,3})\).{0,100},\[\S{1,3},\S{1,3}]=(\S{1,3})\.useState\(\d\);)(.{0,200}children:)(\S{1,3})(\.slice\(\d,\S{1,3})/,
                    replace: "$1let [searchResults,setSearchResults]=$3.useState([]);$self.setUpdateFunc($2,setSearchResults);$4(searchResults.length?searchResults:$5)$6"
                }
            ]
        }
    ],
    renderSearchInput() {
        const [value, setValue] = React.useState(lastSearch);

        React.useEffect(() => {
            const searchResults = this.getFilteredUsers(lastSearch);
            updateFunc(searchResults);
        }, []);

        return <TextInput
            placeholder="Search users..."
            style={{ width: "200px" }}
            onInput={e => {
                const search = (e.target as HTMLInputElement).value.toLowerCase().trim();
                setValue(search);
                lastSearch = search;
                const searchResults = this.getFilteredUsers(search);
                updateFunc(searchResults);
            }} value={value}
        ></TextInput>;
    },
    getSearchResults() {
        return !!lastSearch;
    },
    setUpdateFunc(e, setResults) {
        if (e.listType !== "blocked") return;
        updateFunc = setResults;
        return true;
    },
    getFilteredUsers(search: string) {
        search = search.toLowerCase();
        return (RelationshipStore as any).getBlockedIDs().filter(id => {
            const user = UserStore.getUser(id) as any;
            if (!user) return id === search;
            return id === search || user?.username?.toLowerCase()?.includes(search) || user?.globalName?.toLowerCase()?.includes(search);
        }) as string[];
    }
});
