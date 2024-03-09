/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore, Notifications } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Menu, MessageStore, NavigationRouter, PresenceStore, PrivateChannelsStore, UserStore } from "@webpack/common";
import { type Message } from "discord-types/general";

interface IMessageCreate {
    optimistic: boolean;
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

function ContextCallback(name: "guild" | "user" | "channel"): NavContextMenuPatchCallback {
    return (children, props) => {
        const type = props[name];
        if (!type) return;
        const enabled = bypasses[`${name}s`].includes(type.id);
        if (name === "user" && type.id === UserStore.getCurrentUser().id) return;
        children.splice(-1, 0, (
            <Menu.MenuGroup>
                <Menu.MenuItem
                    id={`dnd-${name}-bypass`}
                    label={`${enabled ? "Remove" : "Add"} DND Bypass`}
                    icon={() => icon(enabled)}
                    action={() => {
                        if (enabled) bypasses[`${name}s`] = bypasses[`${name}s`].filter(id => id !== type.id);
                        else bypasses[`${name}s`].push(type.id);

                        DataStore.set("bypassdnd", bypasses)
                            .then(() => {
                                settings.store[`${name}s`] = bypasses[`${name}s`].join(", ");
                            })
                            .catch(error => {
                                console.error(error);
                            });
                    }}
                />
            </Menu.MenuGroup>
        ));
    };
}

interface Bypasses {
    guilds: string[];
    channels: string[];
    users: string[];
}

let bypasses: Bypasses;

const settings = definePluginSettings({
    guilds: {
        type: OptionType.STRING,
        description: "Guilds to let bypass (notified when pinged anywhere in guild)",
        default: "",
        placeholder: "Separate with commas",
        onChange: async function (value) {
            bypasses.guilds = value.replace(/\s/g, "").split(",").filter(id => id.trim() !== "");
            await DataStore.set("bypassdnd", bypasses);
        }
    },
    channels: {
        type: OptionType.STRING,
        description: "Channels to let bypass (notified when pinged in that channel)",
        default: "",
        placeholder: "Separate with commas",
        onChange: async function (value) {
            bypasses.channels = value.replace(/\s/g, "").split(",").filter(id => id.trim() !== "");
            await DataStore.set("bypassdnd", bypasses);
        }
    },
    users: {
        type: OptionType.STRING,
        description: "Users to let bypass (notified for all messages sent in DMs)",
        default: "",
        placeholder: "Separate with commas",
        onChange: async function (value) {
            bypasses.users = value.replace(/\s/g, "").split(",").filter(id => id.trim() !== "");
            await DataStore.set("bypassdnd", bypasses);
        }
    },
    allowOutsideOfDms: {
        type: OptionType.BOOLEAN,
        description: "Allow selected users to bypass DND outside of DMs too (acts like a channel/guild bypass, but it's for all messages sent by the selected users)"
    }
});

async function showNotification(message: Message, guildId?: string): Promise<void> {
    await Notifications.showNotification({
        title: `${message.author.globalName ?? message.author.username} ${guildId ? `sent a message in ${ChannelStore.getChannel(message.channel_id)?.name}` : "sent a message in a DM"}`,
        body: message.content,
        icon: UserStore.getUser(message.author.id).getAvatarURL(undefined, undefined, false),
        onClick: function () {
            NavigationRouter.transitionTo(`/channels/${guildId ?? "@me"}/${message.channel_id}/${message.id}`);
        }
    });
}

export default definePlugin({
    name: "BypassDND",
    description: "Still get notifications from specific sources when in do not disturb mode. Right-click on users/channels/guilds to set them to bypass do not disturb mode.",
    authors: [Devs.Inbestigator],
    flux: {
        async MESSAGE_CREATE({ optimistic, message, guildId, channelId }: IMessageCreate) {
            try {
                const currentUser = UserStore.getCurrentUser();
                const userStatus = await PresenceStore.getStatus(currentUser.id);
                if (optimistic || message.state === "SENDING" || message.content === "" || message.author.id === currentUser.id || userStatus !== "dnd") {
                    return;
                }
                const mentioned = MessageStore.getMessage(channelId, message.id)?.mentioned;
                if ((bypasses.guilds.includes(guildId) || bypasses.channels.includes(channelId)) && mentioned) {
                    await showNotification(message, guildId);
                } else if (bypasses.users.includes(message.author.id)) {
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
    },
    async start() {
        bypasses = (await DataStore.get("bypassdnd")) ?? { guilds: [], channels: [], users: [] };
        await DataStore.set("bypassdnd", bypasses);
    }
});
