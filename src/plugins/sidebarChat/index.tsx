/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { DefaultExtractAndLoadChunksRegex, extractAndLoadChunksLazy, filters, findByPropsLazy, findComponentByCodeLazy, findLazy, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import {
    ChannelRouter,
    ChannelStore,
    FluxDispatcher,
    Icons,
    Menu,
    MessageActions,
    PermissionsBits,
    PermissionStore,
    PopoutActions,
    React,
    SelectedChannelStore,
    SelectedGuildStore,
    useEffect,
    UserStore,
    useStateFromStores
} from "@webpack/common";
import { Channel, User } from "discord-types/general";

import { SidebarStore } from "./store";


const { HeaderBar, HeaderBarIcon } = mapMangledModuleLazy(".themedMobile]:", {
    HeaderBarIcon: filters.byCode('size:"custom",'),
    HeaderBar: filters.byCode(".themedMobile]:"),
});

const Chat = findComponentByCodeLazy("filterAfterTimestamp:", "chatInputType");
const Resize = findComponentByCodeLazy("sidebarType:", "homeSidebarWidth");
const ChannelHeader = findComponentByCodeLazy(".forumPostTitle]:", '"channel-".concat');
const PopoutWindow = findComponentByCodeLazy("Missing guestWindow reference");
const FullChannelView = findComponentByCodeLazy("showFollowButton:(null");

// love
const ppStyle = findLazy(m => m?.popoutContent && Object.keys(m).length === 1);

const ChatInputTypes = findByPropsLazy("FORM", "NORMAL");
const Sidebars = findByPropsLazy("ThreadSidebar", "MessageRequestSidebar");

const ChannelSectionStore = findStoreLazy("ChannelSectionStore");

const requireChannelContextMenu = extractAndLoadChunksLazy(["&&this.handleActivitiesPopoutClose(),"], new RegExp(DefaultExtractAndLoadChunksRegex.source + ".{1,150}isFavorite"));

interface ContextMenuProps {
    channel: Channel;
    guildId?: string;
    user: User;
}


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
    description: "Open a another channel or a DM as a sidebar or as a popout",
    patches: [
        {
            find: 'case"pendingFriends":',
            replacement: {
                match: /return(\(0,\i\.jsxs?\)\(\i\.\i,{}\))/,
                replace: "return [$1,$self.renderSidebar()]"
            }
        }
    ],

    contextMenus: {
        "user-context": MakeContextCallback("user"),
        "channel-context": MakeContextCallback("channel"),
        "thread-context": MakeContextCallback("channel"),
        "gdm-context": MakeContextCallback("channel"),
    },

    renderSidebar: ErrorBoundary.wrap(() => {
        const [guild, channel] = useStateFromStores(
            [SidebarStore],
            () => [SidebarStore.guild, SidebarStore.channel]
        );

        const [channelSidebar, guildSidebar] = useStateFromStores(
            [ChannelSectionStore],
            () => [
                ChannelSectionStore.getSidebarState(SelectedChannelStore.getChannelId()),
                ChannelSectionStore.getGuildSidebarState(SelectedGuildStore.getGuildId())
            ]
        );

        useEffect(() => {
            if (channel) {
                MessageActions.fetchMessages({
                    channelId: channel.id,
                    limit: 50,
                });
            }
        }, [channel]);

        if (!channel || channelSidebar || guildSidebar) return null;

        return (
            <Resize
                sidebarType={Sidebars.MessageRequestSidebar}
                maxWidth={1500}
            >
                <HeaderBar
                    toolbar={
                        <>
                            <HeaderBarIcon
                                icon={Icons.ArrowsLeftRightIcon}
                                tooltip="Switch channels"
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
                                icon={Icons.WindowLaunchIcon}
                                tooltip="Popout Chat"
                                onClick={async () => {
                                    await requireChannelContextMenu();
                                    PopoutActions.open(
                                        `DISCORD_VC_SC-${channel.id}`,
                                        () => renderPopout(channel), {
                                        defaultWidth: 854,
                                        defaultHeight: 480
                                    });
                                }}
                            />
                            <HeaderBarIcon
                                icon={Icons.XSmallIcon}
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

const renderPopout = ErrorBoundary.wrap((channel: Channel) => {
    // Copy from an unexported function of the one they use in the experiment
    const { Provider } = React.createContext<string | undefined>(undefined);
    const selectedChannel = ChannelStore.getChannel(channel.id);
    return (
        <PopoutWindow
            withTitleBar={true}
            windowKey={`DISCORD_VC_SC-${selectedChannel.id}`}
            title={selectedChannel.name}
            channelId={selectedChannel.id}
            contentClassName={ppStyle.popoutContent}
        >
            <Provider value={selectedChannel.guild_id}>
                <FullChannelView providedChannel={selectedChannel} />
            </Provider>
        </PopoutWindow>
    );
});
