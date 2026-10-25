/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import ErrorBoundary from "@components/ErrorBoundary";
import { LinkIcon } from "@components/Icons";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel, Message } from "@vencord/discord-types";
import { ChannelStore, Menu } from "@webpack/common";
import { JSX } from "react";

import ChannelsTabsContainer from "./components/ChannelTabsContainer";
import * as ChannelTabsUtils from "./util";
import { BasicChannelTabsProps, createTab, handleChannelSwitch, settings } from "./util";
import { clearTabState, useScrollManager } from "./util/scroll";

const contextMenuPatch: NavContextMenuPatchCallback = (children, props: { channel: Channel, messageId?: string; }) => {
    const { channel, messageId } = props;

    const menuItem = (
        <Menu.MenuItem
            label="Open in New Tab"
            id="open-link-in-tab"
            icon={LinkIcon}
            leadingAccessory={{ type: "icon", icon: LinkIcon }}
            action={() => createTab({
                guildId: channel.guild_id || "@me", // Normalize for DMs/Group Chats
                channelId: channel.id
            }, settings.store.openInNewTabAutoSwitch, messageId, true, true)} // The true values are important for bypassing tab limits
        />
    );

    const group = findGroupChildrenByChildId("channel-copy-link", children);
    if (group) {
        group.push(menuItem);
    } else {
        children.splice(-1, 0, (
            <Menu.MenuGroup>
                {menuItem}
            </Menu.MenuGroup>
        ));
    }
};

export default definePlugin({
    name: "ChannelTabs",
    description: "Group your commonly visited channels in tabs, like a browser",
    tags: ["Appearance", "Customisation", "Organisation", "Servers"],
    authors: [Devs.TheSun, Devs.TheKodeToad, EquicordDevs.keifufu, Devs.Nickyux, EquicordDevs.DiabeloDEV, EquicordDevs.justjxke, EquicordDevs.keircn],
    dependencies: ["ContextMenuAPI", "ConcatenatedModules"],
    contextMenus: {
        "channel-mention-context": contextMenuPatch,
        "channel-context": contextMenuPatch,
        "user-context": contextMenuPatch,
        "gdm-context": contextMenuPatch
    },
    patches: [
        // add the channel tab container at the top
        {
            find: '"AppView"',
            replacement: [
                {
                    match: /((\i\?\.params)\.guildId===.{0,300}?)"div",{(?=className:\i\.\i,children:\[)/,
                    replace: "$1$self.render,{currentChannel:$2,",
                    predicate: () => settings.store.tabBarPosition === "top"
                },
                {
                    match: /"div",{(?=.{0,80}(\i\?\.params))/,
                    replace: "$self.render,{currentChannel:$1,",
                    predicate: () => settings.store.tabBarPosition === "bottom"
                }
            ]
        },
        // intercept channel navigation to switch/create tabs
        {
            find: "`transitionToGuild - Transitioning to",
            replacement: {
                match: /(\i\((\i),(\i),\i,\i\)\{)(.{0,25}`transitionToGuild)/,
                replace: "$1$self.handleNavigation($2,$3);$4"
            }
        },
        // ctrl click to open in new tab in inbox mentions
        {
            find: ".deleteRecentMention(",
            replacement: {
                match: /(?<=className:\i.\i,onJump:)(\i)=>(\i\(\i,\i\.id\))(?=.{0,40}message:(\i))/,
                replace: "$1 => { if ($1?.ctrlKey) $self.open($3); else $2 }"
            }
        },
        // ctrl click to open in new tab in search results
        {
            find: "__invalid_searchResultFocusRing",
            replacement: {
                match: /(\i)\.stopPropagation.{0,50}(?=null!=(\i))/,
                replace: "$&if ($1.ctrlKey) return $self.open($2);"
            }
        },
        {
            find: "#{intl::CHANNEL_CHAT_HEADING}",
            replacement: {
                match: /hideSummaries:(\i)===(\i\.\i)\.OVERLAY/,
                replace: "$&,vcChannelTabsMain:$1===$2.NORMAL"
            }
        },
        {
            find: "#{intl::CHANNEL_MESSAGES_A11Y_LABEL}",
            replacement: {
                match: /onScroll:(\i)\.handleScroll(?=,onMouseDown:\i\.handleMouseDown)/,
                replace: "onScroll:$self.useScrollManager($1,arguments[0].vcChannelTabsMain).handleScroll"
            }
        }
    ],

    settings,
    useScrollManager,

    stop() {
        clearTabState();
    },

    start() {
        // migrate old settings to new granular keybind settings
        const store = settings.store as any;
        if (store.enableHotkeys !== undefined) {
            const oldValue = store.enableHotkeys;
            settings.store.enableNumberKeySwitching = oldValue;
            settings.store.enableCloseTabShortcut = oldValue;
            settings.store.enableNewTabShortcut = oldValue;
            settings.store.enableTabCycleShortcut = oldValue;
            delete store.enableHotkeys;
        }
        if (store.hotkeyCount !== undefined) {
            settings.store.numberKeySwitchCount = store.hotkeyCount;
            delete store.hotkeyCount;
        }
        DataStore.get("ChannelTabs_bookmarks").then(bookmarks => {
            if (bookmarks && !Object.keys(settings.store.bookmarks).length)
                settings.store.bookmarks = bookmarks;
        });
    },

    containerHeight: 0,

    flux: {
        CHANNEL_SELECT(data: { channelId: string | null, guildId: string | null; }) {
            // Skip if this navigation was triggered by us (clicking a tab)
            if (ChannelTabsUtils.isNavigatingViaTab()) {
                ChannelTabsUtils.clearNavigationFlag();
                return;
            }

            const isViewingViaBookmark = ChannelTabsUtils.isViewingViaBookmarkMode();

            let { channelId } = data;
            let { guildId } = data;

            // Detect special pages by pathname when no channelId
            if (!channelId) {
                const path = window.location.pathname;

                if (path === "/quest-home" || path.includes("quest-home")) {
                    channelId = "__quests__";
                    guildId = "@me";
                } else if (path.includes("/message-requests")) {
                    channelId = "__message-requests__";
                    guildId = "@me";
                } else if (path === "/channels/@me") {
                    channelId = "__friends__";
                    guildId = "@me";
                } else if (path === "/channels/@me/activity") {
                    channelId = "__activity__";
                    guildId = "@me";
                } else if (path.includes("/shop")) {
                    channelId = "__shop__";
                    guildId = "@me";
                } else if (path.includes("/library")) {
                    channelId = "__library__";
                    guildId = "@me";
                } else if (path.includes("/discovery")) {
                    channelId = "__discovery__";
                    guildId = "@me";
                } else if (path.includes("/store")) {
                    channelId = "__nitro__";
                    guildId = "@me";
                } else if (path.includes("/icymi")) {
                    channelId = "__icymi__";
                    guildId = "@me";
                } else {
                    // Unknown page without channelId - ignore
                    return;
                }
            }

            // if bookmark independent mode setting is on, navigate
            if (isViewingViaBookmark) {
                // dont modify tabs, just let that bookmark action happen
                return;
            }

            // clear bookmark viewing mode only when this is NOT a bookmark navigation
            // this happens when someone manually navigates to a channel (channel list)
            ChannelTabsUtils.clearBookmarkViewingMode();

            // At this point, channelId is guaranteed to be non-null
            if (channelId && guildId) {
                handleChannelSwitch({ guildId, channelId });
            }
        }
    },

    render({ currentChannel, children }: {
        currentChannel: BasicChannelTabsProps,
        children: JSX.Element;
    }) {
        const tabsContainer = (
            <ErrorBoundary>
                <ChannelsTabsContainer {...currentChannel} />
            </ErrorBoundary>
        );

        if (settings.store.tabBarPosition === "top") {
            return (
                <>
                    {tabsContainer}
                    {children}
                </>
            );
        }

        return (
            <>
                {children}
                {tabsContainer}
            </>
        );
    },

    open(message: Message) {
        const tab = {
            channelId: message.channel_id,
            guildId: ChannelStore.getChannel(message.channel_id)?.guild_id,
            compact: false
        };
        createTab(tab, false, message.id);
    },

    handleNavigation(guildId: string, channelId: string) {
        // Skip if we initiated this navigation
        if (ChannelTabsUtils.isNavigatingViaTab()) {
            return;
        }

        // Skip if we're viewing via bookmarks in independent mode
        if (ChannelTabsUtils.isViewingViaBookmarkMode()) {
            return;
        }

        // Clear bookmark viewing mode when navigating to a regular channel
        ChannelTabsUtils.clearBookmarkViewingMode();

        // wait for discord to update channel data
        requestAnimationFrame(() => {
            handleChannelSwitch({ guildId, channelId });
        });
    },

    util: ChannelTabsUtils,
});
