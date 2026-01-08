/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { HeaderBarButton } from "@api/HeaderBar";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import { Channel, Guild, User } from "@vencord/discord-types";
import {
    DefaultExtractAndLoadChunksRegex,
    extractAndLoadChunksLazy,
    filters,
    findByPropsLazy,
    findComponentByCodeLazy,
    findStoreLazy,
    mapMangledModuleLazy
} from "@webpack";
import {
    ChannelRouter,
    ChannelStore,
    FluxDispatcher,
    GuildStore,
    Menu,
    MessageActions,
    MessageStore,
    PermissionsBits,
    PermissionStore,
    PopoutActions,
    RelationshipStore,
    SelectedChannelStore,
    SelectedGuildStore,
    useCallback,
    useEffect,
    useLayoutEffect,
    UserStore,
    useState,
    useStateFromStores
} from "@webpack/common";

import { settings, SidebarStore } from "./store";

const cl = classNameFactory("vc-sidebar-chat-");

const { HeaderBar } = mapMangledModuleLazy(".themedMobile]:", {
    HeaderBar: filters.byCode(".themedMobile]:"),
});

const { ForumView } = mapMangledModuleLazy("forum-grid-header-section-", {
    ForumView: filters.byCode("sidebarState")
});

const ArrowsLeftRightIcon = ({ color, ...rest }) => {
    return (
        <svg
            aria-hidden="true"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            fill={color}
            viewBox="0 0 24 24"
            {...rest}>
            <path d="M2.3 7.7a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.4 1.4L5.42 6H21a1 1 0 1 1 0 2H5.41l2.3 2.3a1 1 0 1 1-1.42 1.4l-4-4ZM17.7 21.7l4-4a1 1 0 0 0 0-1.4l-4-4a1 1 0 0 0-1.4 1.4l2.29 2.3H3a1 1 0 1 0 0 2h15.59l-2.3 2.3a1 1 0 0 0 1.42 1.4Z" />
        </svg>
    );
};

const WindowLaunchIcon = findComponentByCodeLazy("1-1h6a1 1 0 1 0 0-2H5Z");
const XSmallIcon = findComponentByCodeLazy("1.4L12 13.42l5.3 5.3Z");
const Chat = findComponentByCodeLazy("filterAfterTimestamp:", "chatInputType");
const Resize = findComponentByCodeLazy("sidebarType:", "RESIZE_HANDLE_WIDTH)");
const ChannelHeader = findComponentByCodeLazy(".forumPostTitle]:", '"channel-".concat');
const PopoutWindow = findComponentByCodeLazy("Missing guestWindow reference");
const FullChannelView = findComponentByCodeLazy("showFollowButton:(null");
const WanderingCubesLoading = findComponentByCodeLazy('="wanderingCubes"');

const ChatInputTypes = findByPropsLazy("FORM", "NORMAL");
const Sidebars = findByPropsLazy("ThreadSidebar", "MessageRequestSidebar");
const ChatClasses = findByPropsLazy("threadSidebarOpen");

const ChannelSectionStore = findStoreLazy("ChannelSectionStore");

const requireChannelContextMenu = extractAndLoadChunksLazy(
    ["&&this.handleActivitiesPopoutClose(),"],
    new RegExp(DefaultExtractAndLoadChunksRegex.source + ".{1,150}isFavorite")
);

const requireForumView = extractAndLoadChunksLazy(
    ["Missing channel in Channel.renderHeaderToolbar"],
    new RegExp(DefaultExtractAndLoadChunksRegex.source + '.{1,150}name:"ForumChannel"')
);

const MakeContextMenu = (id: string, guildId: string | null) => {
    return (
        <Menu.MenuItem
            id={`vc-sidebar-chat-${id}`}
            label={"Open Sidebar Chat"}
            action={() => {
                FluxDispatcher.dispatch({
                    // @ts-ignore
                    type: "VC_SIDEBAR_CHAT_NEW",
                    guildId,
                    id,
                });
            }}
        />
    );
};

const UserContextPatch: NavContextMenuPatchCallback = (children, args: { user: User; }) => {
    const checks = [
        args.user,
        args.user.id !== UserStore.getCurrentUser().id,
    ];
    if (checks.some(check => !check)) return;
    children.push(MakeContextMenu(args.user.id, null));
};

const ChannelContextPatch: NavContextMenuPatchCallback = (children, args: { channel: Channel; }) => {
    const checks = [
        args.channel,
        args.channel.type !== 4, // categories
        PermissionStore.can(PermissionsBits.VIEW_CHANNEL, args.channel),
    ];
    if (checks.some(check => !check)) return;
    children.push(MakeContextMenu(args.channel.id, args.channel.guild_id));
};

export default definePlugin({
    name: "SidebarChat",
    authors: [Devs.Joona],
    description: "Open a another channel or a DM as a sidebar or as a popout",
    patches: [
        {
            find: 'case"pendingFriends":',
            group: true,
            replacement: [
                {
                    match: /channel_renderer"\);/,
                    replace: "$&const vc_SidebarChat=$self.renderSidebar();"
                },
                {
                    match: /return(\(0,\i\.jsxs?\)\(\i\.\i,{}\))}/,
                    replace: "return [$1, vc_SidebarChat]}"
                },
                {
                    match: /(case \i\.\i.+?return)(.+?);(?=.+?params\.messageId)(?<=channel_renderer".+?)/g,
                    replace: "$1[$2, vc_SidebarChat];",
                    predicate: () => settings.store.patchCommunity
                }
            ]
        },
    ],

    settings,

    contextMenus: {
        "user-context": UserContextPatch,
        "channel-context": ChannelContextPatch,
        "thread-context": ChannelContextPatch,
        "gdm-context": ChannelContextPatch,
    },

    toolboxActions: {
        "Open Previous Chat"() {
            FluxDispatcher.dispatch({
                // @ts-ignore
                type: "VC_SIDEBAR_CHAT_PREVIOUS",
            });
        }
    },

    renderSidebar() {
        const { guild, channel /* width*/ } = useStateFromStores(
            [SidebarStore, GuildStore, ChannelStore], () => {
                const { channelId, guildId } = SidebarStore.getState();
                return {
                    guild: GuildStore.getGuild(guildId),
                    channel: ChannelStore.getChannel(channelId)
                };
            }, []
        );

        const [channelSidebar, guildSidebar] = useStateFromStores(
            [ChannelSectionStore, SelectedChannelStore, ChannelStore], () => {
                const currentChannelId = SelectedChannelStore.getChannelId();
                const currentGuildId = SelectedGuildStore.getGuildId();
                return [
                    ChannelSectionStore.getSidebarState(currentChannelId),
                    ChannelSectionStore.getGuildSidebarState(currentGuildId),
                ];
            }, []
        );

        useEffect(() => {
            if (!channel?.id || MessageStore.getLastMessage(channel.id)) return;
            MessageActions.fetchMessages({
                channelId: channel.id,
                limit: 50,
            });
        }, [channel?.id]);

        const [width, setWidth] = useState(window.innerWidth);

        useLayoutEffect(() => {
            const handleResize = () => setWidth(window.innerWidth);

            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }, []);

        const [View, setViewComponent] = useState<React.ReactNode>(null);

        useEffect(() => {
            if (!channel) return;

            if (channel.isForumLikeChannel()) {
                requireForumView().then(() => {
                    setViewComponent(
                        <ForumView
                            channel={channel}
                            guild={guild}
                            sidebarState={null}
                        />
                    );
                });

                setViewComponent(
                    <div className={ChatClasses.loader}>
                        <WanderingCubesLoading />
                    </div>
                );
            } else {
                setViewComponent(
                    <Chat
                        channel={channel}
                        guild={guild}
                        chatInputType={ChatInputTypes.SIDEBAR}
                    />
                );
            }
        }, [channel]);

        if (!channel || channelSidebar || guildSidebar) return null;

        return (
            <ErrorBoundary noop>
                <Resize
                    sidebarType={Sidebars.MessageRequestSidebar}
                    maxWidth={~~(width * 0.31)/* width - 690*/}
                >
                    <Header channel={channel} guild={guild} />
                    {View}
                </Resize>
            </ErrorBoundary>
        );
    },
});

const Header = ({ guild, channel }: { guild: Guild; channel: Channel; }) => {
    const recipientId = channel.isPrivate() ? channel.getRecipientId() as string : null;

    const name = useStateFromStores([UserStore, RelationshipStore], () => {
        if (!recipientId || channel.name) return channel.name;

        const user = UserStore.getUser(recipientId);
        return RelationshipStore.getNickname(recipientId) || user?.globalName || user?.username;
    }, [recipientId, channel.name]);

    const parentChannel = useStateFromStores(
        [ChannelStore], () => ChannelStore.getChannel(channel?.parent_id),
        [channel?.parent_id]
    );

    // @ts-ignore
    const closeSidebar = () => FluxDispatcher.dispatch({ type: "VC_SIDEBAR_CHAT_CLOSE", });

    const openPopout = useCallback(async () => {
        await requireChannelContextMenu();
        PopoutActions.open(
            `DISCORD_VC_SC-${channel.id}`,
            () => <RenderPopout channel={channel} name={name} />,
            {
                defaultWidth: 854,
                defaultHeight: 480,
            }
        );
    }, [channel, name]);

    const switchChannels = useCallback(() => {
        const mainChannel = getCurrentChannel()!;
        FluxDispatcher.dispatch({
            // @ts-ignore
            type: "VC_SIDEBAR_CHAT_NEW",
            guildId: mainChannel.guild_id,
            id: mainChannel.id,
        });
        ChannelRouter.transitionToChannel(channel.id);
    }, [channel.id]);

    return (
        <HeaderBar
            toolbar={
                <>
                    <HeaderBarButton icon={ArrowsLeftRightIcon} tooltip="Switch channels" onClick={switchChannels} />
                    <HeaderBarButton icon={WindowLaunchIcon} tooltip="Popout Chat" onClick={openPopout} />
                    <HeaderBarButton icon={XSmallIcon} tooltip="Close Sidebar Chat" onClick={closeSidebar} />
                </>
            }
        >
            <ChannelHeader
                channel={channel}
                channelName={name}
                guild={guild}
                parentChannel={parentChannel}
            />
        </HeaderBar>
    );
};

const RenderPopout = ErrorBoundary.wrap(({ channel, name }: { channel: Channel; name: string; }) => {
    // Copy from an unexported function of the one they use in the experiment
    // right click a channel and search withTitleBar:!0,windowKey
    return (
        <PopoutWindow
            withTitleBar
            windowKey={`DISCORD_VC_SC-${channel.id}`}
            title={name || "Equicord"}
            channelId={channel.id}
            contentClassName={cl("popout")}
        >
            <FullChannelView providedChannel={channel} />
        </PopoutWindow>
    );
});
