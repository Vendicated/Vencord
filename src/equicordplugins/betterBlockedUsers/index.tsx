/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { EquicordDevs } from "@utils/constants";
import { getIntlMessage, openUserProfile } from "@utils/discord";
import definePlugin from "@utils/types";
import { Button, React, RelationshipStore, TextInput, UserStore } from "@webpack/common";

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
                    match: /(?<=\}=(\i).*?\]\}\))/,
                    replace: ",$1.listType==='blocked'?$self.renderSearchInput():null"
                },
                {
                    match: /(?<=userId:(\i).*?\}\)\]\}\),)(\(.*?loading:\i\}\))/,
                    replace: "$self.renderUser($1,$2)",
                },
                {
                    match: /(?<=\}=(\i).{0,10}(\i).useState\(\i\).{0,25}\};)/,
                    replace: "let [searchResults,setSearchResults]=$2.useState([]);$self.setUpdateFunc($1,setSearchResults);"
                },
                {
                    match: /(usersList,children:)(\i)/,
                    replace: "$1(searchResults.length?searchResults:$2)"
                },
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
    renderUser(userId: string, rest: any) {
        return (
            <div style={{ display: "flex", gap: "8px" }}>
                <Button color={Button.Colors.PRIMARY} onClick={() => openUserProfile(userId)}>
                    {getIntlMessage("SHOW_USER_PROFILE")}
                </Button>
                {rest}
            </div>
        );
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
