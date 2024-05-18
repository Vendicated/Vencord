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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, Menu, PrivateChannelsStore, React, SelectedChannelStore } from "@webpack/common";
import { Channel, Guild, Message, User } from "discord-types/general";

import OverrideCSS from "./components/OverrideCSS";
import TitleBar from "./components/TitleBar";
import onKey from "./keybinds";
import { channelTabsSettings as settings, ChannelTabsUtils } from "./util";

const channelContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;
    const { channel, messageId }: { channel: Channel, messageId?: string; } = props;
    const group = findGroupChildrenByChildId("channel-copy-link", children);
    if (group)
        group.push(
            <Menu.MenuItem
                label="Open in New Tab"
                id="open-link-in-tab"
                key="open-link-in-tab"
                action={() => ChannelTabsUtils.createTab({
                    guildId: channel.guild_id || "@me",
                    channelId: channel.id
                }, true, messageId)}
            />
        );
};

const userContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;
    const { user }: { user: User; } = props;
    const group = findGroupChildrenByChildId("user-profile", children);
    if (group)
        group.push(
            <Menu.MenuItem
                label="Open DMs in New Tab"
                id="open-link-in-tab"
                key="open-link-in-tab"
                action={async () => ChannelTabsUtils.createTab({
                    guildId: "@me",
                    channelId: await PrivateChannelsStore.getOrEnsurePrivateChannel(user.id)
                }, true)}
            />
        );
};

const guildContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;
    const { guild, }: { guild: Guild; } = props;
    const group = findGroupChildrenByChildId("mark-guild-read", children);
    if (group)
        group.push(
            <Menu.MenuItem
                label="Open in New Tab"
                id="open-link-in-tab"
                key="open-link-in-tab"
                action={() => ChannelTabsUtils.createTab({
                    guildId: guild.id,
                    channelId: (SelectedChannelStore.getMostRecentSelectedTextChannelId(guild.id) as string)
                }, true)}
            />
        );
};

export default definePlugin({
    name: "ChannelTabs",
    description: "Group your commonly visited channels in tabs, like a browser",
    authors: [Devs.TheSun, Devs.TheKodeToad, {
        name: "keifufu",
        id: 469588398110146590n
    }, Devs.Nickyux],
    dependencies: ["ContextMenuAPI"],
    patches: [
        // {
        //     find: ".Routes.COLLECTIBLES_SHOP_FULLSCREEN))",
        //     replacement: {
        //         match: /(\?void 0:(\i)\.channelId.{0,120})\i\.Fragment,{/,
        //         replace: "$1$self.render,{currentChannel:$2,"
        //     }
        // },
        // add the channel tab container at the top
        {
            find: ".wordmarkWindows,",
            replacement: {
                match: /switch\(\i\)\{/,
                replace: "if (!arguments[0].windowKey) return $self.renderTitleBar(); switch(null){"
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
        },
        {
            find: "createBrowserHistory:",
            replacement: {
                match: /([push|replace]:function\(\i,\i\)\{.{0,400})(}\)},)/g,
                replace: "$1; $self.util.saveFromHistoryChange();$2"
            }
        },
    ],

    settings,

    contextMenus: {
        "channel-mention-context": channelContextMenuPatch,
        "channel-context": channelContextMenuPatch,
        "user-context": userContextMenuPatch,
        "guild-context": guildContextMenuPatch
    },
    start() {
        document.addEventListener("keydown", onKey);
    },

    stop() {
        document.removeEventListener("keydown", onKey);
    },

    containerHeight: 0,

    shouldRenderTitleBar() {
        return !location.pathname.startsWith("/popout");
    },
    renderTitleBar() {
        return <ErrorBoundary>
            <TitleBar />
            <OverrideCSS className={"vc-channeltabs-titlebar-height-override-styles"} />
        </ErrorBoundary>;
    },

    open(message: Message) {
        const tab = {
            channelId: message.channel_id,
            guildId: ChannelStore.getChannel(message.channel_id)?.guild_id,
            compact: false
        };
        ChannelTabsUtils.createTab(tab, false, message.id);
    },

    onAppDirectoryClose() {
        this.appDirectoryClosed = true;
        setTimeout(() => this.appDirectoryClosed = false, 0);
    },

    util: ChannelTabsUtils,
});
