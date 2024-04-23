/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import { filters, findAll } from "@webpack";
import { ChannelStore, FluxDispatcher, Menu, React, useState } from "@webpack/common";

export default definePlugin({
    name: "QuickSearch",
    authors: [Devs.CatGirlDShadow],
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

function FindReact(dom, traverseUp = 0) {
    const key = Object.keys(dom).find(key => {
        return key.startsWith("__reactFiber$");
    });
    if (!key) return;
    const domFiber = dom[key];
    if (domFiber == null) return null;
    // react 16+
    const GetCompFiber = fiber => {
        // return fiber._debugOwner; // this also works, but is __DEV__ only
        let parentFiber = fiber.return;
        while (typeof parentFiber.type === "string") {
            parentFiber = parentFiber.return;
        }
        return parentFiber;
    };
    let compFiber = GetCompFiber(domFiber);
    for (let i = 0; i < traverseUp; i++) {
        compFiber = GetCompFiber(compFiber);
    }
    return compFiber.stateNode;
}

const contextMenuPath: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;

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
            label: "Add within channel",
            present: !!channelId,
            value: channelId,
            queryName: "channel_id",
        },
        {
            name: "quick-search-author",
            label: "Add from user",
            present: !!userId,
            value: userId,
            queryName: "author_id",
        },
        {
            name: "quick-search-mentions",
            label: "Add mentioning user",
            present: !!userId,
            value: [userId],
            queryName: "mentions",
        },
        {
            name: "quick-search-content",
            label: "Add message content",
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
                        const searchElem = document.getElementsByClassName("DraftEditor-editorContainer");
                        if (searchElem.length) {
                            const component = FindReact(searchElem[0]);
                            component?.props?.onFocus();
                            component?.props?.handlePastedText(getQueryString(query));
                            component?.props?.onBlur();
                        }
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

function getQueryString(query: QueryOptions) {
    const languages = findAll(filters.byProps("SEARCH_FILTER_FROM"));
    if (!languages.length) return "";
    const selected = languages[languages.length - 1];
    const FROM = selected.SEARCH_FILTER_FROM;
    const IN = selected.SEARCH_FILTER_IN;
    const MENTIONS = selected.SEARCH_FILTER_MENTIONS;

    return (!query.author_id ? "" : `${FROM}: ${query.author_id} `)
        + (!query.channel_id ? "" : `${IN}: ${ChannelStore.getChannel(query.channel_id ?? "")?.name ?? ""} `)
        + (!query.mentions || !query.mentions?.length ? "" : `${MENTIONS}: ${query.mentions[0]} `)
        + (!query.content ? "" : query.content);
}
