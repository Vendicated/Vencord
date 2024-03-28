/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./style.css";

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, Menu } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

import ChannelsTabsContainer from "./components/ChannelTabsContainer";
import { BasicChannelTabsProps, createTab, settings } from "./util";
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
    authors: [Devs.TheSun, Devs.TheKodeToad, Devs.keifufu, Devs.Nickyux],
    dependencies: ["ContextMenuAPI"],
    patches: [
        // add the channel tab container at the top
        {
            find: ".Routes.COLLECTIBLES_SHOP_FULLSCREEN))",
            replacement: {
                match: /(\?void 0:(\i)\.channelId.{0,120})\i\.Fragment,{/,
                replace: "$1$self.render,{currentChannel:$2,"
            }
        },
        // ctrl click to open in new tab in inbox unread
        {
            find: ".messageContainer,onKeyDown",
            replacement: {
                match: /.jumpButton,onJump:\i=>(\i)\(\i,(\i)\.id\)/,
                replace: ".jumpButton,onJump: ev => { if (ev.ctrlKey) $self.open($2); else $1(ev, $2.id) }"
            }
        },
        // ctrl click to open in new tab in inbox mentions
        {
            find: ".deleteRecentMention(",
            replacement: {
                match: /.jumpButton,onJump:(\i)(?=.{0,40}message:(\i))/,
                replace: ".jumpButton,onJump: ev => { if (ev.ctrlKey) $self.open($2); else $1(ev) }"
            }
        },
        // ctrl click to open in new tab in search results
        {
            find: ".searchResultFocusRing",
            replacement: {
                match: /(?<=(\i)\.stopPropagation\(\)\);.{0,100});(?=null!=(\i)&&\i\(\i\))/,
                replace: ";if ($1.ctrlKey) return $self.open($2);"
            }
        },
        // prevent issues with the pins/inbox popouts being too tall
        {
            find: ".messagesPopoutWrap",
            replacement: {
                match: /\i&&\((\i).maxHeight-=\d{1,3}\)/,
                replace: "$&;$1.maxHeight-=$self.containerHeight"
            }
        },
        // scuffed workaround for discord shitcode, see comments in ChannelTabContainer.tsx
        {
            find: ".ApplicationDirectoryEntrypointNames.EXTERNAL",
            replacement: {
                match: /(\.guildSettingsSection\).{0,30})},\[/,
                replace: "$1;$self.onAppDirectoryClose()},["
            }
        }
    ],

    settings,

    start() {
        addContextMenuPatch("channel-mention-context", contextMenuPatch);
        addContextMenuPatch("channel-context", contextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("channel-mention-context", contextMenuPatch);
        removeContextMenuPatch("channel-context", contextMenuPatch);
    },

    containerHeight: 0,

    render({ currentChannel, children }: {
        currentChannel: BasicChannelTabsProps,
        children: JSX.Element;
    }) {
        return <>
            <ErrorBoundary>
                <ChannelsTabsContainer {...currentChannel} />
            </ErrorBoundary>
            {children}
        </>;
    },

    open(message: Message) {
        const tab = {
            channelId: message.channel_id,
            guildId: ChannelStore.getChannel(message.channel_id)?.guild_id,
            compact: false
        };
        createTab(tab, false, message.id);
    },

    onAppDirectoryClose() {
        this.appDirectoryClosed = true;
        setTimeout(() => this.appDirectoryClosed = false, 0);
    },

    util: ChannelTabsUtils,
});
