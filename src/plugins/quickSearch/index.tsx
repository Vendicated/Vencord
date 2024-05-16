/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import { filters, findAll, findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, Menu, PermissionsBits, PermissionStore, React, UserStore, useState } from "@webpack/common";

const EDITOR_STATE_STORE = findByPropsLazy("createEmptyEditorState");
const DECORATORS = findByPropsLazy("generateDecorators");
const EDITOR_STATE = findByPropsLazy("getFilterAutocompletions");
const QUERY_STORE = findByPropsLazy("tokenizeQuery");

export default definePlugin({
    name: "QuickSearch",
    authors: [Devs.PonyGirlDShadow],
    description: "Adds context menu to quickly search stuff",

    async start() {
        addContextMenuPatch("message", contextMenuPath);
        addContextMenuPatch("channel-context", contextMenuPath);
        addContextMenuPatch("user-context", contextMenuPath);
    },

    stop() {
        removeContextMenuPatch("message", contextMenuPath);
        removeContextMenuPatch("channel-context", contextMenuPath);
        removeContextMenuPatch("user-context", contextMenuPath);
    }
});

interface QueryOptions {
    offset?: number;
    channel_id?: string;
    author_id?: string;
    mentions?: Array<string>;
    max_id?: string;
    min_id?: string;
    pinned?: Array<boolean>;
    include_nsfw?: boolean;
    content?: string;
}

const contextMenuPath: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;
    if (props?.channel && !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, props?.channel)) return;

    const channelId = props?.message?.channel_id || (props?.channel?.id);
    const currentChannelId = getCurrentChannel()?.guild_id;
    const searchId = props?.guild?.id || currentChannelId || channelId;
    if (!searchId) return;
    const userId = props?.message?.author?.id || props?.user?.id;
    const content = props?.message?.content;
    const [queryObject, setQueryObject] = useState({});
    const onCheckboxChange = (name: string) => {
        const isEnabled = queryObject[name];
        setQueryObject({ ...queryObject, [name]: !isEnabled });
    };
    const ELEM_INFO = [
        {
            name: "quick-search-channel",
            label: "Search within channel",
            present: !!channelId,
            value: channelId,
            queryName: "channel_id",
        },
        {
            name: "quick-search-author",
            label: "Search from user",
            present: !!userId,
            value: userId,
            queryName: "author_id",
        },
        {
            name: "quick-search-mentions",
            label: "Search mentioning user",
            present: !!userId,
            value: [userId],
            queryName: "mentions",
        },
        {
            name: "quick-search-content",
            label: "Search message content",
            present: !!content,
            value: content ?? "",
            queryName: "content",
        }
    ];
    if (!children.some(child => child?.props?.id === "quick-search")) {
        children.push(
            <Menu.MenuSeparator />,
            <Menu.MenuItem
                id="quick-search"
                label="Quick Search"
            >
                {
                    ELEM_INFO.map(element => {
                        if (element.present)
                            return <Menu.MenuCheckboxItem
                                id={element.name}
                                label={element.label}
                                checked={queryObject[element.name]}
                                action={() => onCheckboxChange(element.name)}
                            />;
                    })
                }

                <Menu.MenuItem
                    id="quick-search-start"
                    label="Search"
                    disabled={!Object.values(queryObject).some(Boolean)}
                    action={() => {
                        const nonTokens = findAll(filters.byProps("NON_TOKEN_TYPE"));
                        const NON_TOKEN_FILTER = nonTokens[nonTokens.length - 1];
                        const getEmptyEditorState = () => EDITOR_STATE_STORE.createEmptyEditorState(
                            DECORATORS.generateDecorators(EDITOR_STATE.default)
                        );
                        const query: QueryOptions = {
                            include_nsfw: true,
                        };

                        ELEM_INFO.forEach(element => {
                            if (queryObject[element.name]) {
                                if (element.queryName) {
                                    query[element.queryName] = element.value;
                                }
                            }
                        });

                        let editorState = getEmptyEditorState();
                        editorState = EDITOR_STATE_STORE.updateContent(getQueryString(query), editorState);
                        editorState = EDITOR_STATE_STORE.truncateContent(editorState, 512);
                        const tokenizedQuery = QUERY_STORE.tokenizeQuery(EDITOR_STATE_STORE.getFirstTextBlock(editorState)).filter(e => e.type !== NON_TOKEN_FILTER.NON_TOKEN_TYPE);
                        editorState = EDITOR_STATE_STORE.applyTokensAsEntities(tokenizedQuery, editorState, getEmptyEditorState());

                        FluxDispatcher.dispatch({
                            type: "SEARCH_EDITOR_STATE_CHANGE",
                            searchId: searchId,
                            editorState: editorState
                        });
                        FluxDispatcher.dispatch({
                            type: "SEARCH_START",
                            query: query,
                            searchId: searchId,
                            queryString: getQueryString(query),
                            searchEverywhere: false
                        });
                    }}
                />

            </Menu.MenuItem>
        );
    }
};

function getCorrectUsername(userId: string) {
    const user = UserStore.getUser(userId);
    return user.username + (user.discriminator !== "0" ? `#${user.discriminator}` : "");
}
function getChannelName(channelId: string) {
    return ChannelStore.getChannel(channelId ?? "")?.name ?? "";
}

function getQueryString(query: QueryOptions) {
    const FROM = EDITOR_STATE.default.FILTER_FROM.key;
    const IN = EDITOR_STATE.default.FILTER_IN.key;
    const MENTIONS = EDITOR_STATE.default.FILTER_MENTIONS.key;

    return (!query.author_id ? "" : `${FROM} ${getCorrectUsername(query.author_id)} `)
        + (!query.channel_id ? "" : `${IN} ${getChannelName(query.channel_id)} `)
        + (!query.mentions || !query.mentions?.length ? "" : `${MENTIONS} ${getCorrectUsername(query.mentions[0])} `)
        + (!query.content ? "" : query.content.replace(/\n/g, ""));
}
