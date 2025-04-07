/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import {
    ChannelRouter,
    ChannelStore,
    FluxDispatcher,
    Menu,
    MessageActions,
    PermissionsBits,
    PermissionStore,
    SelectedChannelStore,
    useEffect,
    UserStore,
    useStateFromStores
} from "@webpack/common";
import { Channel, User } from "discord-types/general";

import { SidebarStore } from "./store";


const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');
const HeaderBar = findComponentByCodeLazy(".themedMobile]:");
const Chat = findComponentByCodeLazy("filterAfterTimestamp:", "chatInputType");
const Resize = findComponentByCodeLazy("sidebarType:", "homeSidebarWidth");
const ChannelHeader = findComponentByCodeLazy("#{intl::HUB_DIRECTORY_CHANNEL_TITLE}");
const ChatInputTypes = findByPropsLazy("FORM", "NORMAL");
const Sidebars = findByPropsLazy("ThreadSidebar", "MessageRequestSidebar");
const SidebarIcon = () => {
    return (
        <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            width="18"
            height="18"
        >
            <path d="M2.75 3.02A3 3 0 0 1 5 2h10a3 3 0 0 1 3 3v7.64c0 .44-.55.7-.95.55a3 3 0 0 0-3.17 4.93l.02.03a.5.5 0 0 1-.35.85h-.05a.5.5 0 0 0-.5.5 2.5 2.5 0 0 1-3.68 2.2l-5.8-3.09A3 3 0 0 1 2 16V5a3 3 0 0 1 .76-1.98Zm1.3 1.95A.04.04 0 0 0 4 5v11c0 .36.2.68.49.86l5.77 3.08a.5.5 0 0 0 .74-.44V8.02a.5.5 0 0 0-.32-.46l-6.63-2.6Z" />
        </svg>
    );
};

interface ContextMenuProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

const ArrowsLeftRightIcon = findComponentByCodeLazy("18.58V3a1");
const XSmallIcon = findComponentByCodeLazy("12l4.94-4.94a1.5")

function MakeContextCallback(name: "user" | "channel"): NavContextMenuPatchCallback {
    return (children, { user, channel, guildId }: ContextMenuProps) => {
        const isUser = name === "user";
        if (isUser && !user) return;
        if (!isUser && (!channel || channel.type === 4)) return;

        if (isUser && user.id === UserStore.getCurrentUser().id) return;
        if (!isUser && (!PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) && channel.type !== 3)) return;

        children.push(
            <Menu.MenuItem
                id={`vc-sidebar-chat-${name}`}
                label={"Open Sidebar Chat"}
                icon={SidebarIcon}
                action={() => {
                    FluxDispatcher.dispatch({
                        // @ts-ignore
                        type: "NEW_SIDEBAR_CHAT",
                        isUser,
                        guildId: guildId || channel.guild_id,
                        id: isUser ? user.id : channel.id,
                    });
                }}
            />
        );
    };
}

export default definePlugin({
    name: "SidebarChat",
    authors: [Devs.Joona],
    description: "Open a another channel or a DM as a sidebar",
    patches: [
        {
            find: "Missing channel in Channel.openChannelContextMenu",
            replacement: [
                {
                    match: /this\.renderThreadSidebar\(\),/,
                    replace: "$&$self.renderSidebar({width:this.props.width,stockSidebarOpen:this.props.channelSidebarState || this.props.guildSidebarState}),"
                }
            ]
        }
    ],

    contextMenus: {
        "user-context": MakeContextCallback("user"),
        "channel-context": MakeContextCallback("channel"),
        "thread-context": MakeContextCallback("channel"),
        "gdm-context": MakeContextCallback("channel"),
    },

    renderSidebar: ErrorBoundary.wrap(({ width, stockSidebarOpen }: { width: number, stockSidebarOpen: any; }) => {
        const [guild, channel] = useStateFromStores(
            [SidebarStore],
            () => [SidebarStore.guild, SidebarStore.channel]
        );

        useEffect(() => {
            if (channel) {
                MessageActions.fetchMessages({
                    channelId: channel.id,
                    limit: 50,
                });
            }
        }, [channel]);

        if (!channel || stockSidebarOpen) return null;

        return (
            <Resize
                sidebarType={Sidebars.MessageRequestSidebar}
                maxWidth={width - 610}
            >
                <HeaderBar
                    toolbar={
                        <>
                            <HeaderBarIcon
                                icon={() => <ArrowsLeftRightIcon style={{ transform: "rotate(90deg)" }} />}
                                tooltip="Switch Channels"
                                onClick={() => {
                                    const currentChannel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
                                    FluxDispatcher.dispatch({
                                        // @ts-ignore
                                        type: "NEW_SIDEBAR_CHAT",
                                        isUser: currentChannel.id === "1",
                                        guildId: currentChannel?.guild_id,
                                        id: currentChannel.id,
                                    });
                                    ChannelRouter.transitionToChannel(channel.id);
                                }}
                            />
                            <HeaderBarIcon
                                icon={() => (<XSmallIcon style={{width: "24px",height: "24px"}} />)}
                                tooltip="Close Sidebar Chat"
                                onClick={() => {
                                    FluxDispatcher.dispatch({
                                        // @ts-ignore
                                        type: "CLOSE_SIDEBAR_CHAT",
                                    });
                                }}
                            />
                        </>
                    }
                >
                    <ChannelHeader
                        channel={channel}
                        channelName={channel?.name}
                        guild={guild}
                        parentChannel={ChannelStore.getChannel(channel?.parent_id)}
                    />
                </HeaderBar>
                <Chat
                    channel={channel}
                    guild={guild}
                    chatInputType={ChatInputTypes.SIDEBAR}
                />
            </Resize>
        );
    }),
});
