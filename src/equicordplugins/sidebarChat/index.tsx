/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { HeaderBarButton } from "@api/HeaderBar";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import { Channel, Guild, User } from "@vencord/discord-types";
import {
    DefaultExtractAndLoadChunksRegex,
    extractAndLoadChunksLazy,
    findByPropsLazy,
    findComponentByCodeLazy,
    findCssClassesLazy,
    findStoreLazy
} from "@webpack";
import {
    ChannelActionCreators,
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
    PopoutWindowStore,
    RelationshipStore,
    SelectedChannelStore,
    SelectedGuildStore,
    ThemeStore,
    useCallback,
    useEffect,
    useLayoutEffect,
    UserStore,
    useState,
    useStateFromStores
} from "@webpack/common";

import {
    getOpenPopoutWindowKeys,
    getPersistedPopoutChannelIds,
    getPopoutWindowKey,
    isPopoutWindowOpen,
    settings,
    SidebarStore,
    syncPersistedPopoutWindows
} from "./store";

const cl = classNameFactory("vc-sidebar-chat-");

const themeParents: Record<string, string> = { darker: "dark", midnight: "dark" };
function getThemeClasses(theme: string) {
    const parent = themeParents[theme];
    return parent
        ? `theme-${parent} theme-${theme} images-${parent}`
        : `theme-${theme} images-${theme}`;
}

const HeaderBar = findComponentByCodeLazy("toolbarClassName:", "}),onDoubleClick:");
const ForumView = findComponentByCodeLazy("sidebarState");

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
const ChannelHeader = findComponentByCodeLazy(".GUILD_ANNOUNCEMENT", "`channel-");
const PopoutWindow = findComponentByCodeLazy("Missing guestWindow reference");
const WanderingCubesLoading = findComponentByCodeLazy('="wanderingCubes"');

const ChatInputTypes = findByPropsLazy("FORM", "NORMAL");
const Sidebars = findByPropsLazy("ThreadSidebar", "MessageRequestSidebar");
const ChatClasses = findCssClassesLazy("threadSidebarOpen", "loader");

const ChannelSectionStore = findStoreLazy("ChannelSectionStore");

const requireForumView = extractAndLoadChunksLazy(
    ["Missing channel in Channel.renderHeaderToolbar"],
    new RegExp(DefaultExtractAndLoadChunksRegex.source + '.{1,150}name:"ForumChannel"')
);

function getChannelTitle(channel: Channel | null | undefined) {
    if (!channel) return "Chat";

    if (channel.isPrivate()) {
        const recipientId = channel.getRecipientId?.();
        if (!channel.name && recipientId) {
            const user = UserStore.getUser(recipientId);
            if (user) {
                return RelationshipStore.getNickname(recipientId) || user.globalName || user.username || "DM";
            }
        }

        return channel.name || "DM";
    }

    return channel.name || "Chat";
}

function canOpenPopout(channel: Channel) {
    if (channel.isPrivate()) return true;
    return !channel.isCategory() && !channel.isDirectory() && !channel.isVocal();
}

function getPopoutMenuLabel(channelId: string) {
    return isPopoutWindowOpen(channelId) ? "Close popout chat" : "Popout chat";
}

let restorePersistedPopoutsInterval: number | null = null;
let restoringPersistedPopouts = false;

function clearPersistedPopoutRestoreLoop() {
    restoringPersistedPopouts = false;
    if (restorePersistedPopoutsInterval !== null) {
        window.clearInterval(restorePersistedPopoutsInterval);
        restorePersistedPopoutsInterval = null;
    }
}

async function waitForChannel(channelId: string, timeoutMs = 2500) {
    const startedAt = Date.now();
    while (Date.now() - startedAt <= timeoutMs) {
        const channel = ChannelStore.getChannel(channelId);
        if (channel) return channel;

        await new Promise(resolve => setTimeout(resolve, 80));
    }

    return null;
}

async function waitForDmChannel(userId: string, timeoutMs = 2500) {
    const startedAt = Date.now();
    while (Date.now() - startedAt <= timeoutMs) {
        const channelId = ChannelStore.getDMFromUserId?.(userId);
        if (channelId) return channelId;

        await new Promise(resolve => setTimeout(resolve, 80));
    }

    return null;
}

async function openPopoutFromUserMenu(userId: string) {
    try {
        const channelId = await Promise.resolve(ChannelActionCreators.getOrEnsurePrivateChannel(userId));
        if (!channelId) return;

        const channel = await waitForChannel(channelId);
        if (channel) openPopout(channel.id);
        return;
    } catch {
        const fallbackChannelId = await waitForDmChannel(userId);
        if (!fallbackChannelId) return;

        const channel = await waitForChannel(fallbackChannelId);
        if (channel) openPopout(channel.id);
    }
}

function closePopout(channelId: string, syncPersistence = true) {
    const windowKey = getPopoutWindowKey(channelId);
    PopoutActions.close(windowKey);
    if (syncPersistence && !restoringPersistedPopouts) {
        syncPersistedPopoutWindows();
    }
}

function openPopout(channelId: string, syncPersistence = true) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel || !canOpenPopout(channel)) return;

    const windowKey = getPopoutWindowKey(channelId);

    if (isPopoutWindowOpen(channelId)) {
        closePopout(channelId, syncPersistence);
        return;
    }

    const title = getChannelTitle(channel);

    PopoutActions.open(
        windowKey,
        () => <RenderPopout channel={channel} name={title} windowKey={windowKey} />,
        {
            defaultWidth: 854,
            defaultHeight: 480,
        }
    );

    PopoutActions.setAlwaysOnTop(windowKey, settings.store.popoutAlwaysOnTop);
    if (syncPersistence && !restoringPersistedPopouts) {
        syncPersistedPopoutWindows();
    }
}

function restorePersistedPopouts() {
    if (!settings.store.persistPopoutWindows) return;

    clearPersistedPopoutRestoreLoop();

    const pendingRestoreIds = new Set(getPersistedPopoutChannelIds());
    if (pendingRestoreIds.size === 0) return;

    restoringPersistedPopouts = true;

    const attemptRestore = () => {
        for (const channelId of pendingRestoreIds) {
            const channel = ChannelStore.getChannel(channelId);
            if (!channel || !canOpenPopout(channel)) continue;

            pendingRestoreIds.delete(channelId);
            openPopout(channelId, false);
        }

        if (pendingRestoreIds.size === 0) {
            clearPersistedPopoutRestoreLoop();
            syncPersistedPopoutWindows();
        }
    };

    attemptRestore();

    if (pendingRestoreIds.size > 0) {
        restorePersistedPopoutsInterval = window.setInterval(attemptRestore, 250);
    }
}

const createSidebarChatContextMenuItem = (id: string, guildId: string | null) => {
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

const createPopoutChatContextMenuItem = (id: string, label: string, action: () => void | Promise<void>) => {
    return (
        <Menu.MenuItem
            id={`vc-sidebar-chat-popout-${id}`}
            label={label}
            action={() => {
                void action();
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
    const channelId = ChannelStore.getDMFromUserId?.(args.user.id) ?? null;
    const isOpen = channelId ? isPopoutWindowOpen(channelId) : false;

    children.push(createSidebarChatContextMenuItem(args.user.id, null));
    children.push(createPopoutChatContextMenuItem(
        args.user.id,
        isOpen ? "Close popout chat" : "Popout chat",
        () => {
            if (channelId && isOpen) {
                closePopout(channelId);
                return;
            }

            return openPopoutFromUserMenu(args.user.id);
        }
    ));
};

const ChannelContextPatch: NavContextMenuPatchCallback = (children, args: { channel: Channel; }) => {
    const checks = [
        args.channel,
        args.channel.type !== 4, // categories
        PermissionStore.can(PermissionsBits.VIEW_CHANNEL, args.channel),
    ];
    if (checks.some(check => !check)) return;
    children.push(createSidebarChatContextMenuItem(args.channel.id, args.channel.guild_id));
    children.push(createPopoutChatContextMenuItem(
        args.channel.id,
        getPopoutMenuLabel(args.channel.id),
        () => openPopout(args.channel.id)
    ));
};

export default definePlugin({
    name: "SidebarChat",
    authors: [Devs.Joona, EquicordDevs.justjxke],
    description: "Open a channel or DM as a sidebar or a popout.",
    tags: ["Appearance", "Chat", "Servers"],
    dependencies: ["HeaderBarAPI"],
    patches: [
        {
            find: 'case"pendingFriends":',
            group: true,
            replacement: [
                {
                    match: /if\(null!=.{0,50}ROLE_SUBSCRIPTIONS/,
                    replace: "const vc_SidebarChat=$self.renderSidebar();$&"
                },
                {
                    match: /=>(\(0,\i\.jsxs?\)\(\i,{}\))/,
                    replace: "=>[$1, vc_SidebarChat]"
                },
                {
                    match: /(?<=guild_products.{0,1600})(case \i\.\i.{0,50}return)(.+?\}\));(?=.+?params\.messageId)/g,
                    replace: "$1[$2, vc_SidebarChat];",
                    predicate: () => settings.store.patchCommunity
                },
                {
                    match: /(case \i\.\i\.GAME_SERVERS:.{0,50}\.CHANNEL.{0,25}return)(.*?);/,
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
    headerBarButton: {
        icon: WindowLaunchIcon,
        render: () => (
            <>
                <PopoutPersistenceSync />
                <WrappedPopoutHeaderButton />
            </>
        )
    },
    stop() {
        clearPersistedPopoutRestoreLoop();
        syncPersistedPopoutWindows();
        for (const windowKey of getOpenPopoutWindowKeys()) {
            PopoutActions.close(windowKey);
        }
    },
    async start() {
        restorePersistedPopouts();
    }
});

const Header = ({ guild, channel }: { guild: Guild; channel: Channel; }) => {
    const name = useStateFromStores([UserStore, RelationshipStore], () => getChannelTitle(channel), [channel.id, channel.name]);

    const parentChannel = useStateFromStores(
        [ChannelStore], () => ChannelStore.getChannel(channel?.parent_id),
        [channel?.parent_id]
    );

    // @ts-ignore
    const closeSidebar = () => FluxDispatcher.dispatch({ type: "VC_SIDEBAR_CHAT_CLOSE", });

    const isPopoutOpen = useStateFromStores(
        [PopoutWindowStore], () => isPopoutWindowOpen(channel.id),
        [channel.id]
    );

    const openPopoutClick = useCallback(() => openPopout(channel.id), [channel.id]);

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
                    <HeaderBarButton
                        key={`${channel.id}-${isPopoutOpen ? "open" : "closed"}`}
                        icon={isPopoutOpen ? XSmallIcon : WindowLaunchIcon}
                        tooltip={isPopoutOpen ? "Close popout chat" : "Popout chat"}
                        selected={isPopoutOpen}
                        onClick={openPopoutClick}
                    />
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

const RenderPopout = ErrorBoundary.wrap(({ channel, name, windowKey }: { channel: Channel; name: string; windowKey: string; }) => {
    // Copy from an unexported function of the one they use in the experiment
    // right click a channel and search withTitleBar:!0,windowKey
    useEffect(() => {
        if (!channel?.id || MessageStore.getLastMessage(channel.id)) return;

        MessageActions.fetchMessages({
            channelId: channel.id,
            limit: 50,
        });
    }, [channel?.id]);

    const theme = useStateFromStores([ThemeStore], () => ThemeStore?.theme ?? "dark");
    const guild = useStateFromStores([GuildStore], () => channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null, [channel.guild_id]);

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
                    chatInputType={ChatInputTypes.NORMAL}
                />
            );
        }
    }, [channel, guild]);

    return (
        <PopoutWindow
            withTitleBar
            windowKey={windowKey}
            title={name || "Equicord"}
            channelId={channel.id}
            contentClassName={cl("popout")}
        >
            <div className={`${getThemeClasses(theme)} ${cl("window")}`}>
                {View}
            </div>
        </PopoutWindow>
    );
});

function PopoutHeaderButton() {
    const channelState = useStateFromStores(
        [SelectedChannelStore, ChannelStore, PopoutWindowStore],
        () => {
            const channelId = SelectedChannelStore.getChannelId();
            const channel = channelId ? ChannelStore.getChannel(channelId) : null;

            return {
                channel,
                isOpen: channel ? isPopoutWindowOpen(channel.id) : false,
                label: getChannelTitle(channel)
            };
        },
        []
    );

    if (!channelState.channel || !canOpenPopout(channelState.channel)) return null;

    const { channel, isOpen, label } = channelState;

    return (
        <HeaderBarButton
            key={`${channel.id}-${isOpen ? "open" : "closed"}`}
            icon={isOpen ? XSmallIcon : WindowLaunchIcon}
            tooltip={isOpen ? "Close popout chat" : `Popout chat for ${label}`}
            aria-label="Popout chat"
            selected={isOpen}
            onClick={() => openPopout(channel.id)}
        />
    );
}

const WrappedPopoutHeaderButton = ErrorBoundary.wrap(PopoutHeaderButton, { noop: true });

function PopoutPersistenceSync() {
    const openWindowKeySignature = useStateFromStores(
        [PopoutWindowStore],
        () => getOpenPopoutWindowKeys().join("|"),
        []
    );

    useEffect(() => {
        if (restoringPersistedPopouts) return;
        syncPersistedPopoutWindows();
    }, [openWindowKeySignature]);

    return null;
}
