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

interface ChannelStreamItem {
    type: string;
    content?: unknown;
    hasUnread?: boolean;
    hasJumpTarget?: boolean;
}

function isHiddenGroup(item: ChannelStreamItem | undefined): item is ChannelStreamItem & { content: unknown[]; } {
    return item?.type === "MESSAGE_GROUP_BLOCKED" || item?.type === "MESSAGE_GROUP_IGNORED";
}

let lastSearch = "";
let updateFunc = (v: any) => { };

export default definePlugin({
    name: "BetterBlockedUsers",
    description: "Allows you to search in blocked users list, make names selectable in settings, skips blocked profile prompt, and groups blocked / ignored messages.",
    tags: ["Appearance", "Shortcuts"],
    authors: [EquicordDevs.TheArmagan],
    patches: [
        {
            find: "`forum-post-action-bar-",
            replacement: {
                match: /(?<=\i=)(\i)(?=\.map\(\(\i,\i\)=>\{if\(\i\.type===\i\.\i\.DIVIDER\))/,
                replace: "($1=$self.mergeHiddenMessages($1))"
            }
        },
        {
            // skips the profile prompt allowing the user to view blocked profiles without hitting yes everytime
            find: "useSetting(),{isBlocked:",
            replacement: {
                match: /(?<=isBlocked:)\i\.\i\.isBlocked\(\i\)/,
                replace: "false"
            }
        },
        {
            find: '"],{numberOfBlockedUsers:',
            group: true,
            replacement: [
                {
                    match: /(?<=\(0,\i\.jsx\)\(\i,\{listType:(\i),numberOfUsers:\i\.length\}\),)/,
                    replace: "$1==='blocked'?$self.renderSearchInput():null,"
                },
                {
                    match: /(?<=\{userId:(\i).*?\.globalName.{0,25}\}\)\]\}\),)(\(.*?loading:\i\}\))/,
                    replace: "$self.renderUser($1,$2)",
                },
                {
                    match: /(?<=userIds:\i,listType:\i\}=(\i).{0,30}(\i)\.useState\(\d+\);)/,
                    replace: "let [searchResults,setSearchResults]=$2.useState([]);$self.setUpdateFunc($1,setSearchResults);"
                },
                {
                    match: /(?<=\i,children:)(\i)(?=\.slice)/,
                    replace: "(searchResults.length?searchResults:$1)"
                },
            ]
        }
    ],
    mergeHiddenMessages(stream: ChannelStreamItem[]) {
        const merged: ChannelStreamItem[] = [];
        let groups: Record<string, ChannelStreamItem & { content: unknown[]; }> = {};

        for (const item of stream) {
            if (!isHiddenGroup(item)) {
                groups = {};
                merged.push(item);
                continue;
            }

            const previous = groups[item.type];
            if (previous) {
                previous.content.push(...item.content);
                previous.hasUnread ||= item.hasUnread;
                previous.hasJumpTarget ||= item.hasJumpTarget;
            } else {
                merged.push(groups[item.type] = { ...item, content: [...item.content] });
            }
        }

        return merged;
    },
    renderSearchInput() {
        const [value, setValue] = React.useState(lastSearch);

        React.useEffect(() => {
            const searchResults = this.getFilteredUsers(lastSearch);
            updateFunc(searchResults);
        }, []);

        return <div className="vc-bbu-search">
            <TextInput
                placeholder="Search users..."
                style={{ width: "200px" }}
                onInput={e => {
                    const search = (e.target as HTMLInputElement).value.toLowerCase().trim();
                    setValue(search);
                    lastSearch = search;
                    const searchResults = this.getFilteredUsers(search);
                    updateFunc(searchResults);
                }} value={value}
            />
        </div>;
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
