/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Notifications } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { localStorage } from "@utils/localStorage";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Menu, MessageStore, NavigationRouter, PresenceStore, PrivateChannelsStore, UserStore, WindowStore } from "@webpack/common";
import type { Message } from "discord-types/general";

interface MessageCreateProps {
    channelId: string;
    guildId: string;
    message: Message;
}

type Sources = "guild" | "user" | "channel";

function Icon(enabled: boolean) {
    return (
        <svg width="18" height="18">
            <circle cx="9" cy="9" r="8" fill={enabled ? "currentColor" : "var(--status-danger)"} />
            <circle cx="9" cy="9" r="3.75" fill={enabled ? "black" : "white"} />
        </svg>
    );
}

const getBypassed = (source: Sources) =>
    (JSON.parse(localStorage.getItem("vc-bypass-dnd") ?? '{"guild": [], "user": [], "channel": []}') as Record<Sources, string[]>)[source];

const getAllBypassed = () => ({
    guild: getBypassed("guild"),
    user: getBypassed("user"),
    channel: getBypassed("channel"),
});

function setLists(source: Sources, value: string[]) {
    localStorage.setItem("vc-bypass-dnd", JSON.stringify({ ...getAllBypassed(), [source]: value }));
}

async function showNotification(message: Message, guildId: string | undefined) {
    try {
        const channel = ChannelStore.getChannel(message.channel_id);
        const channelRegex = /<#(\d+)>/g;
        const userRegex = /<@(\d+)>/g;

        message.content = message.content.replace(channelRegex, (_, channelId) => {
            return `#${ChannelStore.getChannel(channelId)?.name}`;
        });

        message.content = message.content.replace(userRegex, (_, userId) => {
            return `@${(UserStore.getUser(userId) as any).globalName}`;
        });

        await Notifications.showNotification({
            title: `${(message.author as any).globalName} ${guildId ? `(#${channel?.name}, ${ChannelStore.getChannel(channel?.parent_id)?.name})` : ""}`,
            body: message.content,
            icon: UserStore.getUser(message.author.id).getAvatarURL(undefined, undefined, false),
            onClick: () => {
                NavigationRouter.transitionTo(`/channels/${guildId ?? "@me"}/${message.channel_id}/${message.id}`);
            }
        });

        if (settings.store.notificationSound) {
            new Audio("https://discord.com/assets/9422aef94aa931248105.mp3").play();
        }
    } catch (error) {
        new Logger("BypassDND").error("Failed to notify user: ", error);
    }
}

const ContextCallback = (name: Sources): NavContextMenuPatchCallback => (children, props: Record<Sources, { id: string; }>) => {
    const data = props[name];
    if (!data) return;
    const isEnabled = getBypassed(name).includes(data.id);

    if (name === "user" && data.id === UserStore.getCurrentUser().id) {
        return;
    }

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id={`dnd-${name}-bypass`}
                label={`${isEnabled ? "Remove" : "Add"} DND Bypass`}
                icon={() => Icon(isEnabled)}
                action={() => {
                    const bypasses = getBypassed(name);
                    setLists(name, isEnabled ? bypasses.filter(id => id !== data.id) : [...bypasses, data.id]);
                }}
            />
        </Menu.MenuGroup>
    ));
};

const settings = definePluginSettings({
    allowOutsideOfDms: {
        type: OptionType.BOOLEAN,
        description: "Allow selected users to bypass do not disturb outside of DMs (get notified of all messages you're mentioned in from selected users)",
    },
    notificationSound: {
        type: OptionType.BOOLEAN,
        description: "Whether the notification sound should be played",
    }
});

export default definePlugin({
    name: "BypassDND",
    description: "Get notifications from specific sources even in do not disturb mode. Right-click on users/channels/guilds to set bypass do not disturb mode.",
    authors: [Devs.Inbestigator],
    flux: {
        async MESSAGE_CREATE({ message, guildId, channelId }: MessageCreateProps) {
            try {
                const currentUser = UserStore.getCurrentUser();
                const userStatus = await PresenceStore.getStatus(currentUser.id);
                const currentChannelId = getCurrentChannel()?.id ?? "0";
                const isLookingAtChannel = channelId === currentChannelId && WindowStore.isFocused();

                if (message.author.id === currentUser.id || isLookingAtChannel || userStatus !== "dnd") {
                    return;
                }

                const isMentioned = MessageStore.getMessage(channelId, message.id)?.mentioned;

                if ((getBypassed("guild").includes(guildId) || getBypassed("channel").includes(channelId)) && isMentioned) {
                    await showNotification(message, guildId);
                } else if (getBypassed("user").includes(message.author.id)) {
                    const userChannelId = await PrivateChannelsStore.getOrEnsurePrivateChannel(message.author.id);
                    if (channelId === userChannelId || (isMentioned && settings.store.allowOutsideOfDms === true)) {
                        await showNotification(message, guildId);
                    }
                }
            } catch (error) {
                new Logger("BypassDND").error("Failed to handle message: ", error);
            }
        }
    },
    settings,
    contextMenus: {
        "guild-context": ContextCallback("guild"),
        "channel-context": ContextCallback("channel"),
        "user-context": ContextCallback("user"),
    }
});
