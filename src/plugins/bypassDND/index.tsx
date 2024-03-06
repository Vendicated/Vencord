import { NavContextMenuPatchCallback, addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { DataStore, Notifications } from "@api/index";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Menu, PresenceStore, PrivateChannelsStore, UserStore } from "@webpack/common";
import { Channel, Guild, Message, User } from "discord-types/general";
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

const GuildContext: NavContextMenuPatchCallback = (children, { guild }: ContextProps) => () => {
    if (!guild) return;
    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="dnd-guild-bypass"
                label={`${bypasses["guilds"].includes(guild.id) ? "Remove" : "Add"} DND Bypass`}
                action={async () => {
                    if (bypasses["guilds"].includes(guild.id)) bypasses["guilds"] = await bypasses["guilds"].filter(id => id !== guild.id);
                    else bypasses["guilds"].push(guild.id);
                    await DataStore.set("bypassdnd", bypasses);
                    settings.store.guilds = (bypasses["guilds"].join(', '));
                }}
            />
        </Menu.MenuGroup>
    ));
};

const ChannelContext: NavContextMenuPatchCallback = (children, { channel }: ContextProps) => () => {
    if (!channel) return;
    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="dnd-channel-bypass"
                label={`${bypasses["channels"].includes(channel.id) ? "Remove" : "Add"} DND Bypass`}
                action={async () => {
                    if (bypasses["channels"].includes(channel.id)) bypasses["channels"] = await bypasses["channels"].filter(id => id !== channel.id);
                    else bypasses["channels"].push(channel.id);
                    await DataStore.set("bypassdnd", bypasses);
                    settings.store.channels = (bypasses["channels"].join(', '));
                }}
            />
        </Menu.MenuGroup>
    ));
};

const UserContext: NavContextMenuPatchCallback = (children, { user }: ContextProps) => () => {
    if (!user) return;
    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="dnd-user-bypass"
                label={`${bypasses["users"].includes(user.id) ? "Remove" : "Add"} DND Bypass`}
                action={async () => {
                    if (bypasses["users"].includes(user.id)) bypasses["users"] = await bypasses["users"].filter(id => id !== user.id);
                    else bypasses["users"].push(user.id);
                    await DataStore.set("bypassdnd", bypasses);
                    settings.store.users = (bypasses["users"].join(', '));
                }}
            />
        </Menu.MenuGroup>
    ));
};

type Bypasses = {
    guilds: string[];
    channels: string[];
    users: string[];
};

let bypasses: Bypasses;

const settings = definePluginSettings({
    guilds: {
        type: OptionType.STRING,
        description: "Guilds to let bypass (notified when pinged anywhere in guild)",
        default: "",
        placeholder: "Separate with commas",
        onChange: async function (value) {
            bypasses["guilds"] = value.replace(/\s/g, '').split(',').filter(id => id.trim() !== '');
            await DataStore.set("bypassdnd", bypasses);
        },
    },
    channels: {
        type: OptionType.STRING,
        description: "Channels to let bypass (notified when pinged in that channel)",
        default: "",
        placeholder: "Separate with commas",
        onChange: async function (value) {
            bypasses["channels"] = value.replace(/\s/g, '').split(',').filter(id => id.trim() !== '');
            await DataStore.set("bypassdnd", bypasses);
        },
    },
    users: {
        type: OptionType.STRING,
        description: "Users to let bypass (notified for all messages)",
        default: "",
        placeholder: "Separate with commas",
        onChange: async function (value) {
            bypasses["users"] = value.replace(/\s/g, '').split(',').filter(id => id.trim() !== '');
            await DataStore.set("bypassdnd", bypasses);
        },
    },
    allowOutsideOfDM: {
        type: OptionType.BOOLEAN,
        description: "Allow selected users to send notifications outside of DM (acts like a channel/guild bypass, but it's for all messages sent by the selected users)",
    }
});

async function showUserNotification(message: Message) {
    await Notifications.showNotification({
        title: `${message.author.globalName ?? message.author.username} sent a message in a DM`,
        body: message.content,
        icon: UserStore.getUser(message.author.id).getAvatarURL(undefined, undefined, false),
    });
}

async function showChannelNotification(message: Message) {
    await Notifications.showNotification({
        title: `${message.author.globalName ?? message.author.username} sent a message in ${ChannelStore.getChannel(message.channel_id).name}`,
        body: message.content,
        icon: UserStore.getUser(message.author.id).getAvatarURL(undefined, undefined, false),
    });
}

export default definePlugin({
    name: "BypassDND",
    description: "Still get notifications from specific sources when in do not disturb mode. Right-click on users/channels/guilds to set them to bypass do not disturb mode.",
    authors: [Devs.Inbestigator],
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, guildId, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (!message.content) return;
            const currentUser = UserStore.getCurrentUser();
            if (message.author.id === currentUser.id) return;
            if (await PresenceStore.getStatus(currentUser.id) != 'dnd') return;
            if ((bypasses.guilds.includes(guildId) || bypasses.channels.includes(channelId)) && (message.content.includes(`<@${currentUser.id}>`) || message.mentions.some(mention => mention.id === currentUser.id))) {
                await showChannelNotification(message);
                return;
            }
            if (bypasses.users.includes(message.author.id)) {
                if (channelId === await PrivateChannelsStore.getOrEnsurePrivateChannel(message.author.id)) {
                    await showUserNotification(message);
                } else if ((message.content.includes(`<@${currentUser.id}>`) || message.mentions.some(mention => mention.id === currentUser.id)) && settings.store.allowOutsideOfDM) {
                    await showChannelNotification(message);
                }
            }
        }
    },
    settings,
    async start() {
        addContextMenuPatch("guild-context", GuildContext);
        addContextMenuPatch("channel-context", ChannelContext);
        addContextMenuPatch("user-context", UserContext);
        bypasses = await DataStore.get("bypassdnd") ?? { guilds: [], channels: [], users: [] };
        await DataStore.set("bypassdnd", bypasses);
    },
    stop() {
        removeContextMenuPatch("guild-context", GuildContext);
        removeContextMenuPatch("channel-context", ChannelContext);
        removeContextMenuPatch("user-context", UserContext);
    }
});
