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

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu.js";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex.jsx";
import { Devs } from "@utils/constants.js";
import { LazyComponent } from "@utils/misc.jsx";
import definePlugin from "@utils/types";
import { findByCode, findByPropsLazy } from "@webpack";
import { ChannelStore, Forms, Menu } from "@webpack/common";
import { Channel, Message } from "discord-types/general/index.js";

import { ChannelsTabsContainer } from "./components";
import { channelTabsSettings, ChannelTabsUtils } from "./util.js";

const Keybind = LazyComponent(() => findByCode(".keyClassName"));
const KeybindClasses = findByPropsLazy("ddrArrows");

const messageLinkRegex = /^https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/(\d{17,20}|@me)\/(\d{17,20})(?:\/(\d{17,20}))?$/;
const messageLinkContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;
    const { itemHref }: { itemHref?: string; } = props;
    if (!itemHref) return;
    const [_, guildId, channelId, messageId] = itemHref.match(messageLinkRegex) ?? [];
    if (!channelId) return;
    const group = findGroupChildrenByChildId("copy-native-link", children);
    if (group && !group.some(child => child?.props?.id === "open-link-in-tab")) {
        group.push(<Menu.MenuItem
            label="Open In New Tab"
            id="open-link-in-tab"
            key="open-link-in-tab"
            action={() => ChannelTabsUtils.createTab({
                guildId,
                channelId
            }, messageId ?? true)}
        />);
    }
};

const channelMentionContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;
    const { channel, messageId }: { channel: Channel, messageId?: string; } = props;
    const group = findGroupChildrenByChildId("channel-copy-link", children);
    if (group && !group.some(child => child?.props?.id === "open-link-in-tab")) {
        group.push(<Menu.MenuItem
            label="Open In New Tab"
            id="open-link-in-tab"
            key="open-link-in-tab"
            action={() => ChannelTabsUtils.createTab({
                guildId: channel.guild_id,
                channelId: channel.id
            }, messageId ?? true)}
        />);
    }
};

const channelContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;
    const { channel }: { channel: Channel; } = props;
    const group = findGroupChildrenByChildId("channel-copy-link", children);
    if (group && !group.some(child => child?.props?.id === "open-link-in-tab")) {
        group.push(<Menu.MenuItem
            label="Open In New Tab"
            id="open-link-in-tab"
            key="open-link-in-tab"
            action={() => ChannelTabsUtils.createTab({
                guildId: channel.guild_id,
                channelId: channel.id
            }, true)}
        />);
    }
};

export default definePlugin({
    name: "ChannelTabs",
    description: "Group your commonly visited channels in tabs, like a browser",
    authors: [Devs.TheSun],
    dependencies: ["ContextMenuAPI"],
    patches: [
        // add the channel tab container at the top
        {
            find: ".LOADING_DID_YOU_KNOW",
            replacement: {
                // TODO: remake patch
                match: /(===(\i)\?void 0:\i\.channelId\).{0,130})Fragment,{children:(\(0,\i\.jsxs\)\("div",{.{0,500}sidebarTheme:.{0,1000}\.CHANNEL_THREAD_VIEW\(.{0,1500}\(0,\i\.jsx\)\(.{0,100}\)]}\))/,
                replace: "$1Fragment,{children:[$self.render($2),$3]"
            }
        },
        // ctrl click to open in new tab in inbox
        {
            find: ".messageContainer,onKeyDown",
            replacement: {
                match: /onJump:function\(\i\){(return \i\((\i),(\i).id)/,
                replace: "onJump:function($2){ if($2.ctrlKey) return $self.open($3);$1"
            }
        },
        // ctrl click to open in new tab in search results
        {
            find: ".searchResultFocusRing",
            replacement: {
                match: /jumpTo=function\((\i)\){.{0,100}(\i)=\i\.result.{0,50}\)\);/,
                replace: "$&if($1.ctrlKey) return $self.open($2);"
            }
        }
    ],

    settings: channelTabsSettings,

    start() {
        addContextMenuPatch("message", messageLinkContextMenuPatch);
        addContextMenuPatch("channel-mention-context", channelMentionContextMenuPatch);
        addContextMenuPatch("channel-context", channelContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("message", messageLinkContextMenuPatch);
        removeContextMenuPatch("channel-mention-context", channelContextMenuPatch);
        removeContextMenuPatch("channel-context", channelContextMenuPatch);
    },

    render(props) {
        return <ErrorBoundary>
            <ChannelsTabsContainer {...props} />
        </ErrorBoundary>;
    },

    open(message: Message) {
        const tab = {
            channelId: message.channel_id,
            guildId: ChannelStore.getChannel(message.channel_id)?.guild_id
        };
        ChannelTabsUtils.createTab(tab, message.id);
    },

    settingsAboutComponent: () => <>
        <Forms.FormTitle tag="h3">Keybinds</Forms.FormTitle>
        <Flex flexDirection="row">
            <Forms.FormSection>
                <Forms.FormText className={KeybindClasses.keybindDescription}>Switch between tabs</Forms.FormText>
                <Keybind shortcut="mod+left" className={KeybindClasses.keybindKey} />
                <Keybind shortcut="mod+right" className={KeybindClasses.keybindKey} />
            </Forms.FormSection>
            <Forms.FormSection>
                <Forms.FormText className={KeybindClasses.keybindDescription}>Move tabs</Forms.FormText>
                <Keybind shortcut="shift+left" className={KeybindClasses.keybindKey} />
                <Keybind shortcut="shfit+right" className={KeybindClasses.keybindKey} />
            </Forms.FormSection>
            <Forms.FormSection>
                <Forms.FormText className={KeybindClasses.keybindDescription}>Open new tab</Forms.FormText>
                <Keybind shortcut="mod+n" className={KeybindClasses.keybindKey} />
            </Forms.FormSection>
            <Forms.FormSection>
                <Forms.FormText className={KeybindClasses.keybindDescription}>Close tab</Forms.FormText>
                <Keybind shortcut="mod+w" className={KeybindClasses.keybindKey} />
            </Forms.FormSection>
        </Flex>
        <Forms.FormText>You can also Ctrl+click on the Jump button of a search result to open it in a new tab</Forms.FormText>
    </>,

    // TODO: remove
    util: ChannelTabsUtils
});
