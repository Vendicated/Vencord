/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel, Message } from "@vencord/discord-types";
import { ChannelStore, Menu } from "@webpack/common";
import { JSX } from "react";

import ChannelsTabsContainer from "./components/ChannelTabsContainer";
import { BasicChannelTabsProps, createTab, handleChannelSwitch, settings } from "./util";
import * as ChannelTabsUtils from "./util";

const contextMenuPatch: NavContextMenuPatchCallback = (children, props: { channel: Channel, messageId?: string; }) =>
    () => {
        const { channel, messageId } = props;
        const group = findGroupChildrenByChildId("channel-copy-link", children);
        group?.push(
            <Menu.MenuItem
                label="Open in New Tab"
                id="open-link-in-tab"
                action={() => createTab({
                    guildId: channel.guild_id,
                    channelId: channel.id
                }, true, messageId)}
            />
        );
    };

export default definePlugin({
    name: "ChannelTabs",
    description: "Group your commonly visited channels in tabs, like a browser",
    authors: [Devs.TheSun, Devs.TheKodeToad, EquicordDevs.keifufu, Devs.Nickyux, EquicordDevs.DiabeloDEV],
    dependencies: ["ContextMenuAPI"],
    contextMenus: {
        "channel-mention-context": contextMenuPatch,
        "channel-context": contextMenuPatch
    },
    patches: [
        // add the channel tab container at the top
        {
            find: ".COLLECTIBLES_SHOP_FULLSCREEN))",
            replacement: {
                match: /(\?void 0:(\i)\.channelId.{0,300})"div",{/,
                replace: "$1$self.render,{currentChannel:$2,"
            }
        },
        // intercept channel navigation to switch/create tabs
        {
            find: "sourceLocationStack,null",
            replacement: {
                match: /(\i\((\i),(\i),\i,\i\)\{)(.{0,25}"transitionToGuild)/,
                replace: "$1$self.handleNavigation($2,$3);$4"
            }
        },
        // ctrl click to open in new tab in inbox unread
        {
            find: ".messageContainer,onKeyDown",
            replacement: {
                match: /.jumpButton,onJump:\i=>(\i)\(\i,(\i)\.id\)/,
                replace: ".jumpButton,onJump: event => { if (event.ctrlKey) $self.open($2); else $1(event, $2.id) }"
            }
        },
        // ctrl click to open in new tab in inbox mentions
        {
            find: ".deleteRecentMention(",
            replacement: {
                match: /(?<=.jumpMessageButton,onJump:)(\i)(?=.{0,20}message:(\i))/,
                replace: "event => { if (event.ctrlKey) $self.open($2); else $1(event) }"
            }
        },
        // ctrl click to open in new tab in search results
        {
            find: "(this,\"handleMessageClick\"",
            replacement: {
                match: /(\i)\.stopPropagation.{0,50}(?=null!=(\i))/,
                replace: "$&if ($1.ctrlKey) return $self.open($2);"
            }
        },
        // prevent issues with the pins/inbox popouts being too tall
        {
            find: ".messagesPopoutWrap),style",
            replacement: {
                match: /\i&&\((\i).maxHeight.{0,5}\)/,
                replace: "$&;$1.maxHeight-=$self.containerHeight"
            }
        }
    ],

    settings,

    containerHeight: 0,

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
        if (!guildId || !channelId) return;

        // wait for discord to update channel data
        requestAnimationFrame(() => {
            handleChannelSwitch({ guildId, channelId });
        });
    },

    util: ChannelTabsUtils,
});
