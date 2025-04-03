/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, React, RelationshipStore, TextInput, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

let lastSearch = "";
let updateFunc = (v: any) => { };

const settings = definePluginSettings({
    hideBlockedWarning: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Skip the warning about blocked/ignored users when opening the profile through the blocklist.",
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "BetterBlockedUsers",
    description: "Allows you to search in blocked users list and makes names clickable in settings.",
    authors: [EquicordDevs.TheArmagan, Devs.Elvyra],
    settings,
    patches: [
        {
            find: '"],{numberOfBlockedUsers:',
            replacement: [
                {
                    match: /(?<=\}=(\i).*?\]\}\))/,
                    replace: ",$1.listType==='blocked'?$self.renderSearchInput():null"
                },
                {
                    match: /(?<=className:\i.userInfo,)(?=children:.{0,20}user:(\i))/,
                    replace: "style:{cursor:'pointer'},onClick:()=>$self.openUserProfile($1),"
                },
                {
                    match: /(?<=\}=(\i).{0,10}(\i).useState\(.{0,1}\);)/,
                    replace: "let [searchResults,setSearchResults]=$2.useState([]);$self.setUpdateFunc($1,setSearchResults);"
                },
                {
                    match: /(usersList,children:)(\i)/,
                    replace: "$1(searchResults.length?searchResults:$2)"
                },
            ]
        },
        {
            find: "UserProfileModalHeaderActionButtons",
            replacement: [
                {
                    match: /(?<=return \i)\|\|(\i)===.*?.FRIEND/,
                    replace: (_, type) => `?null:${type} === 1|| ${type} === 2`,
                },
                {
                    match: /(?<=\i.bot.{0,50}children:.*?onClose:)(\i)/,
                    replace: "() => {$1();$self.closeSettingsWindow()}",
                }
            ],
        },
        {
            find: ',["user"])',
            replacement: {
                match: /(?<=isIgnored:.*?,\[\i,\i]=\i.useState\()\i\|\|\i\|\|\i.*?]\);/,
                replace: "false);"
            },
            predicate: () => settings.store.hideBlockedWarning,
        },
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
    },
    closeSettingsWindow: () => {
        FluxDispatcher.dispatch({ type: "LAYER_POP" });
    },
    openUserProfile: (user: User) => {
        openUserProfile(user.id);
    },
});
