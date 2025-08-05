/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getCurrentChannel, getCurrentGuild } from "@utils/discord";
import definePlugin from "@utils/types";
import { Channel, User } from "@vencord/discord-types";
import {
    DefaultExtractAndLoadChunksRegex,
    extractAndLoadChunksLazy,
    filters,
    findByPropsLazy,
    findComponentByCodeLazy,
    findLazy,
    findStoreLazy,
    mapMangledModuleLazy
} from "@webpack";
import {
    ChannelRouter,
    ChannelStore,
    FluxDispatcher,
    Menu,
    MessageActions,
    MessageStore,
    PermissionsBits,
    PermissionStore,
    PopoutActions,
    React,
    useEffect,
    UserStore,
    useState,
    useStateFromStores
} from "@webpack/common";

import { settings, SidebarStore } from "./store";

// ??? no clue why this HeaderBarIcon doesnt work, its the same as the one below
const { HeaderBar, /* HeaderBarIcon*/ } = mapMangledModuleLazy(".themedMobile]:", {
    HeaderBarIcon: filters.componentByCode('size:"custom",'),
    HeaderBar: filters.byCode(".themedMobile]:"),
});

// from toolbox
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

const ArrowsLeftRightIcon = () => {
    return <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="var(--interactive-normal)" d="M2.3 7.7a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.4 1.4L5.42 6H21a1 1 0 1 1 0 2H5.41l2.3 2.3a1 1 0 1 1-1.42 1.4l-4-4ZM17.7 21.7l4-4a1 1 0 0 0 0-1.4l-4-4a1 1 0 0 0-1.4 1.4l2.29 2.3H3a1 1 0 1 0 0 2h15.59l-2.3 2.3a1 1 0 0 0 1.42 1.4Z"></path></svg>;
};

const WindowLaunchIcon = findComponentByCodeLazy("1-1h6a1 1 0 1 0 0-2H5Z");
const XSmallIcon = findComponentByCodeLazy("1.4L12 13.42l5.3 5.3Z");
const Chat = findComponentByCodeLazy("filterAfterTimestamp:", "chatInputType");
const Resize = findComponentByCodeLazy("sidebarType:", ".RESIZE_HANDLE_WIDTH");
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
    return (children, { user, channel }: ContextMenuProps) => {
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
                        guildId: channel.guild_id,
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
                match: /return(\(0,\i\.jsxs?\)\(\i\.\i,{}\))}/,
                replace: "return [$1, $self.renderSidebar()]}"
            }
        },
    ],

    settings,

    contextMenus: {
        "user-context": MakeContextCallback("user"),
        "channel-context": MakeContextCallback("channel"),
        "thread-context": MakeContextCallback("channel"),
        "gdm-context": MakeContextCallback("channel"),
    },

    renderSidebar: ErrorBoundary.wrap(() => {
        const { guild, channel, /* width*/ } = useStateFromStores([SidebarStore], () => SidebarStore.getFullState());
        const [width, setWidth] = useState(0);

        const [channelSidebar, guildSidebar] = useStateFromStores(
            [ChannelSectionStore],
            () => [
                ChannelSectionStore.getSidebarState(getCurrentChannel()?.id),
                ChannelSectionStore.getGuildSidebarState(getCurrentGuild()?.id),
            ]
        );

        useEffect(() => {
            if (channel) {
                if (MessageStore.getLastMessage(channel.id)) return;
                MessageActions.fetchMessages({
                    channelId: channel.id,
                    limit: 50,
                });
            }
        }, [channel]);

        useEffect(() => {
            if (width === 0) setWidth(window.innerWidth);
            const handleResize = () => setWidth(window.innerWidth);

            window.addEventListener("resize", handleResize);
            return () => {
                window.removeEventListener("resize", handleResize);
            };
        }, []);

        if (!channel || channelSidebar || guildSidebar) return null;

        return (
            <Resize
                sidebarType={Sidebars.MessageRequestSidebar}
                maxWidth={~~(width * 0.31)/* width - 690*/
                }
            >
                <HeaderBar
                    toolbar={
                        <>
                            <HeaderBarIcon
                                icon={ArrowsLeftRightIcon}
                                tooltip="Switch channels"
                                onClick={() => {
                                    const currentChannel = getCurrentChannel()!;
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
                                icon={WindowLaunchIcon}
                                tooltip="Popout Chat"
                                onClick={async () => {
                                    await requireChannelContextMenu();
                                    PopoutActions.open(
                                        `DISCORD_VC_SC-${channel.id}`,
                                        () => <RenderPopout channel={channel} />,
                                        {
                                            defaultWidth: 854,
                                            defaultHeight: 480
                                        });
                                }}
                            />
                            <HeaderBarIcon
                                icon={XSmallIcon}
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

const RenderPopout = ErrorBoundary.wrap(({ channel }: { channel: Channel; }) => {
    // Copy from an unexported function of the one they use in the experiment
    // right click a channel and search withTitleBar:!0,windowKey
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
