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
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Menu, MessageStore, NavigationRouter, PresenceStore, PrivateChannelsStore, UserStore, WindowStore } from "@webpack/common";
import { type Message } from "discord-types/general";

interface IMessageCreate {
    channelId: string;
    guildId: string;
    message: Message;
}

function icon(enabled?: boolean) {
    return <svg
        width="18"
        height="18"
    >
        <circle cx="9" cy="9" r="8" fill={!enabled ? "var(--status-danger)" : "currentColor"} />
        <circle cx="9" cy="9" r="3.75" fill={!enabled ? "white" : "black"} />
    </svg>;
}

function processIds(value) {
    return value.replace(/\s/g, "").split(",").filter(id => id.trim() !== "").join(", ");
}

async function showNotification(message, guildId) {
    const channel = ChannelStore.getChannel(message.channel_id);
    const channelRegex = /<#(\d{19})>/g;
    const userRegex = /<@(\d{18})>/g;

    message.content = message.content.replace(channelRegex, (match, channelId) => {
        return `#${ChannelStore.getChannel(channelId)?.name}`;
    });

    message.content = message.content.replace(userRegex, (match, userId) => {
        return `@${UserStore.getUser(userId)?.globalName}`;
    });

    await Notifications.showNotification({
        title: `${message.author.globalName} ${guildId ? `(#${channel?.name}, ${ChannelStore.getChannel(channel?.parent_id)?.name})` : ""}`,
        body: message.content,
        icon: UserStore.getUser(message.author.id).getAvatarURL(undefined, undefined, false),
        onClick: function () {
            NavigationRouter.transitionTo(`/channels/${guildId ?? "@me"}/${message.channel_id}/${message.id}`);
        }
    });
}

function ContextCallback(name: "guild" | "user" | "channel"): NavContextMenuPatchCallback {
    return (children, props) => {
        const type = props[name];
        if (!type) return;
        const enabled = settings.store[`${name}s`].split(", ").includes(type.id);
        if (name === "user" && type.id === UserStore.getCurrentUser().id) return;
        children.splice(-1, 0, (
            <Menu.MenuGroup>
                <Menu.MenuItem
                    id={`dnd-${name}-bypass`}
                    label={`${enabled ? "Remove" : "Add"} DND Bypass`}
                    icon={() => icon(enabled)}
                    action={() => {
                        let bypasses: string[] = settings.store[`${name}s`].split(", ");
                        if (enabled) bypasses = bypasses.filter(id => id !== type.id);
                        else bypasses.push(type.id);
                        settings.store[`${name}s`] = bypasses.filter(id => id.trim() !== "").join(", ");
                    }}
                />
            </Menu.MenuGroup>
        ));
    };
}

const settings = definePluginSettings({
    guilds: {
        type: OptionType.STRING,
        description: "Guilds to let bypass (notified when pinged anywhere in guild)",
        default: "",
        placeholder: "Separate with commas",
        onChange: value => settings.store.guilds = processIds(value)
    },
    channels: {
        type: OptionType.STRING,
        description: "Channels to let bypass (notified when pinged in that channel)",
        default: "",
        placeholder: "Separate with commas",
        onChange: value => settings.store.channels = processIds(value)
    },
    users: {
        type: OptionType.STRING,
        description: "Users to let bypass (notified for all messages sent in DMs)",
        default: "",
        placeholder: "Separate with commas",
        onChange: value => settings.store.users = processIds(value)
    },
    allowOutsideOfDms: {
        type: OptionType.BOOLEAN,
        description: "Allow selected users to bypass DND outside of DMs too (acts like a channel/guild bypass, but it's for all messages sent by the selected users)"
    }
});

export default definePlugin({
    name: "BypassDND",
    description: "Still get notifications from specific sources when in do not disturb mode. Right-click on users/channels/guilds to set them to bypass do not disturb mode.",
    authors: [Devs.Inbestigator],
    flux: {
        async MESSAGE_CREATE({ message, guildId, channelId }: IMessageCreate) {
            try {
                const currentUser = UserStore.getCurrentUser();
                const userStatus = await PresenceStore.getStatus(currentUser.id);
                const currentChannelId = getCurrentChannel()?.id ?? "0";
                if (message.state === "SENDING" || message.content === "" || message.author.id === currentUser.id || (channelId === currentChannelId && WindowStore.isFocused()) || userStatus !== "dnd") {
                    return;
                }
                const mentioned = MessageStore.getMessage(channelId, message.id)?.mentioned;
                if ((settings.store.guilds.split(", ").includes(guildId) || settings.store.channels.split(", ").includes(channelId)) && mentioned) {
                    await showNotification(message, guildId);
                } else if (settings.store.users.split(", ").includes(message.author.id)) {
                    const userChannelId = await PrivateChannelsStore.getOrEnsurePrivateChannel(message.author.id);
                    if (channelId === userChannelId || (mentioned && settings.store.allowOutsideOfDms === true)) {
                        await showNotification(message, guildId);
                    }
                }
            } catch (error) {
                console.error(error);
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
