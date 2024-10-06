/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { filters, findByPropsLazy, findComponentByCodeLazy, mapMangledModuleLazy } from "@webpack";
import {
    ChannelStore,
    FluxDispatcher,
    Icons,
    Menu,
    MessageActions,
    PermissionsBits,
    PermissionStore,
    SelectedChannelStore,
    Text,
    useEffect,
    UserStore,
    useState
} from "@webpack/common";
import { Channel, User } from "discord-types/general";

const { HeaderBar, HeaderBarIcon } = mapMangledModuleLazy(".themedMobile]:", {
    HeaderBarIcon: filters.byCode('size:"custom",'),
    HeaderBar: filters.byCode(".themedMobile]:"),
});
const Chat = findComponentByCodeLazy("filterAfterTimestamp:", "chatInputType");
const Resize = findComponentByCodeLazy("sidebarType:", "homeSidebarWidth");
const DMHeader = findComponentByCodeLazy(".cursorPointer:null,children");
const Relationships = findByPropsLazy("ensurePrivateChannel");
const ChatInputTypes = findByPropsLazy("FORM");
const Sidebars = findByPropsLazy("ThreadSidebar");

interface SidebarData {
    isUser: boolean;
    guildId: string;
    id: string;
}

export interface ContextMenuProps {
    channel: Channel;
    guildId?: string;
    user: User;
}


function MakeContextCallback(name: "user" | "channel"): NavContextMenuPatchCallback {
    return (children, { user, channel, guildId }: ContextMenuProps) => {
        const isUser = name === "user";
        if (isUser && !user) return;
        if (!isUser && !channel) return;

        if (isUser && user.id === UserStore.getCurrentUser().id) return;
        if (!isUser && (
            channel.id === SelectedChannelStore.getChannelId() ||
            (!PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) && channel.type !== 3)
        )) return;

        children.push(
            <Menu.MenuItem
                id={`vc-sidebar-chat-${name}`}
                label={`Open ${isUser ? "User" : "Channel"} Sidebar Chat`}
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
                    match: /this.renderThreadSidebar\(\),/,
                    replace: "$&$self.renderSidebar({maxWidth:this.props.width}),"
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
    renderSidebar: ErrorBoundary.wrap(({ maxWidth }: { maxWidth: number; }) => {
        const [channel, setChannel] = useState<Channel | null>(null);
        const [guild, setGuild] = useState<Channel | null>(null);

        useEffect(() => {
            const cb = (e: SidebarData) => {
                const { id, guildId, isUser } = e;
                setGuild(guildId ? ChannelStore.getChannel(guildId) : null);
                if (!isUser) {
                    setChannel(ChannelStore.getChannel(id));
                    return;
                }
                // @ts-expect-error outdated type
                const existingDm = ChannelStore.getDMChannelFromUserId(id);

                if (existingDm) {
                    setChannel(existingDm);
                    return;
                }

                Relationships.ensurePrivateChannel(id).then((channelId: string) => {
                    setChannel(ChannelStore.getChannel(channelId));
                });
            };
            // @ts-ignore
            FluxDispatcher.subscribe("NEW_SIDEBAR_CHAT", cb);

            // @ts-ignore
            return () => FluxDispatcher.unsubscribe("NEW_SIDEBAR_CHAT", cb);
        }, []);

        useEffect(() => {
            if (channel) {
                MessageActions.fetchMessages({
                    channelId: channel.id,
                    limit: 50,
                });
            }
        }, [channel]);

        if (!channel) return null;

        return (
            <Resize
                sidebarType={Sidebars.MessageRequestSidebar}
                maxWidth={maxWidth - 850}
            >
                <HeaderBar
                    toolbar={
                        <HeaderBarIcon
                            icon={Icons.XSmallIcon}
                            tooltip="Close Sidebar Chat"
                            onClick={() => {
                                setChannel(null);
                                setGuild(null);
                            }}
                        />
                    }
                >
                    {!channel?.name && (
                        <DMHeader
                            level={1}
                            channel={channel}
                        />
                    )}
                    <Text>{channel?.name ?? ""}</Text>
                </HeaderBar>
                <Chat
                    channel={channel}
                    guild={guild}
                    chatInputType={ChatInputTypes.NORMAL}
                />
            </Resize>
        );
    }),
});
