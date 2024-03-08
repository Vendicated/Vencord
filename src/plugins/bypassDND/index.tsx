/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, type NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { DataStore, Notifications } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Menu, NavigationRouter, PresenceStore, PrivateChannelsStore, UserStore } from "@webpack/common";
import { type Channel, type Guild, type Message, type User } from "discord-types/general";

interface ContextProps {
    channel: Channel;
    user: User;
    guild: Guild;
}

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
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

const GuildContext: NavContextMenuPatchCallback = (children, { guild }: ContextProps) => () => {
    const enabled = bypasses.guilds.includes(guild.id);
    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="dnd-guild-bypass"
                label={`${enabled ? "Remove" : "Add"} DND Bypass`}
                icon={() => icon(enabled)}
                action={() => {
                    if (enabled) bypasses.guilds = bypasses.guilds.filter(id => id !== guild.id);
                    else bypasses.guilds.push(guild.id);
                    DataStore.set("bypassdnd", bypasses)
                        .then(() => {
                            settings.store.guilds = bypasses.guilds.join(", ");
                        })
                        .catch(error => {
                            console.error(error);
                        });
                }}

            />
        </Menu.MenuGroup>
    ));
};

const ChannelContext: NavContextMenuPatchCallback = (children, { channel }: ContextProps) => () => {
    const enabled = bypasses.channels.includes(channel.id);
    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="dnd-channel-bypass"
                label={`${enabled ? "Remove" : "Add"} DND Bypass`}
                icon={() => icon(enabled)}
                action={() => {
                    if (enabled) bypasses.channels = bypasses.channels.filter(id => id !== channel.id);
                    else bypasses.channels.push(channel.id);

                    DataStore.set("bypassdnd", bypasses)
                        .then(() => {
                            settings.store.channels = bypasses.channels.join(", ");
                        })
                        .catch(error => {
                            console.error(error);
                        });
                }}

            />
        </Menu.MenuGroup>
    ));
};

const UserContext: NavContextMenuPatchCallback = (children, { user }: ContextProps) => () => {
    const enabled = bypasses.users.includes(user.id);
    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="dnd-user-bypass"
                label={`${enabled ? "Remove" : "Add"} DND Bypass`}
                icon={() => icon(enabled)}
                action={() => {
                    if (enabled) bypasses.users = bypasses.users.filter(id => id !== user.id);
                    else bypasses.users.push(user.id);

                    DataStore.set("bypassdnd", bypasses)
                        .then(() => {
                            settings.store.users = bypasses.users.join(", ");
                        })
                        .catch(error => {
                            console.error(error);
                        });
                }}
            />
        </Menu.MenuGroup>
    ));
};

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
        async MESSAGE_CREATE({ optimistic, type, message, guildId, channelId }: IMessageCreate) {
            try {
                if (optimistic || type !== "MESSAGE_CREATE") return;
                if (message.state === "SENDING") return;
                if (message.content === "") return;
                const currentUser = UserStore.getCurrentUser();
                if (message.author.id === currentUser.id) return;
                if (await PresenceStore.getStatus(currentUser.id) !== "dnd") return;
                if ((bypasses.guilds.includes(guildId) || bypasses.channels.includes(channelId)) && (message.content.includes(`<@${currentUser.id}>`) || message.mentions.some(mention => mention.id === currentUser.id))) {
                    await showNotification(message, guildId);
                    return;
                }
                if (bypasses.users.includes(message.author.id)) {
                    if (channelId === await PrivateChannelsStore.getOrEnsurePrivateChannel(message.author.id)) {
                        await showNotification(message);
                    } else if ((message.content.includes(`<@${currentUser.id}>`) || message.mentions.some(mention => mention.id === currentUser.id)) && (settings.store.allowOutsideOfDms === true)) {
                        await showNotification(message, guildId);
                    }
                }
            } catch (error) {
                console.error(error);
            }
        }
    },
    settings,
    async start() {
        addContextMenuPatch("guild-context", GuildContext);
        addContextMenuPatch("channel-context", ChannelContext);
        addContextMenuPatch("user-context", UserContext);
        bypasses = (await DataStore.get("bypassdnd")) ?? { guilds: [], channels: [], users: [] };
        await DataStore.set("bypassdnd", bypasses);
    },
    stop() {
        removeContextMenuPatch("guild-context", GuildContext);
        removeContextMenuPatch("channel-context", ChannelContext);
        removeContextMenuPatch("user-context", UserContext);
    }
});
